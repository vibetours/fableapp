import { Msg, MsgPayload, Payload_UpdatePersistentState } from "./msg";
import api from "./api";
import { getSearializedDom, SerDoc, SerNode } from "./doc";
import { IExtStoredState, IProject } from "./types";
import { getActiveTab } from "./common";
import { isCrossOrigin, getCookieHeaderForUrl, getAbsoluteUrl } from "./utils";

const PUBLIC_ASSET_BUCKET = process.env.REACT_APP_PUBLIC_ASSET_BUCKET as string;

const APP_STATE_PROJECT = "app_state_project";
const APP_STATE_SELECTION_ID = "app_state_project_sel_id";
const APP_STATE_SELECTION_IDX = "app_state_project_sel_index";

async function fetchAndSyncProjects(): Promise<IExtStoredState> {
  const selInfo = await chrome.storage.local.get([
    APP_STATE_SELECTION_ID,
    APP_STATE_SELECTION_IDX,
  ]);
  const projects = await api<Array<IProject>>("/projects");
  let selProjectIdx = selInfo[APP_STATE_SELECTION_IDX] || -1;
  let selProjectId = selInfo[APP_STATE_SELECTION_ID] || -1;

  if (projects.length) {
    if (selProjectIdx === -1) {
      selProjectIdx = 0;
    }
    selProjectId = projects[selProjectIdx].id;
    // WARN the extension does not use unlimited storage option, hence there might be case
    // where sotrage is overflowing. Handle that
    // https://developer.chrome.com/docs/extensions/reference/storage/#property-local
    await chrome.storage.local.set({
      [APP_STATE_PROJECT]: projects,
      [APP_STATE_SELECTION_ID]: selProjectId,
      [APP_STATE_SELECTION_IDX]: selProjectIdx,
    });
  }
  return {
    projects,
    selectedProjectIndex: selProjectIdx,
    selectedProjectId: selProjectId,
  };
}

// Retrieved the project from localstorage
// If none is present in localstorage then it try to get projects from server
// New projects are not retrieved unless the project dropdown is clicked
async function getPersistentExtState(): Promise<IExtStoredState> {
  const projects = (await chrome.storage.local.get(
    APP_STATE_PROJECT
  )) as Array<IProject> | null;
  const selProjectId = -1;
  const selProjectIdx = -1;

  const shouldFetchFromServer = false;

  if (!projects || !projects.length) {
    return fetchAndSyncProjects();
  }
  return {
    projects: [],
    selectedProjectId: -1,
    selectedProjectIndex: -1,
  };
}

chrome.runtime.onMessage.addListener(
  async (msg: MsgPayload<any>, sender, sendResponse) => {
    switch (msg.type) {
      case Msg.INIT:
        const state = await getPersistentExtState();
        chrome.runtime.sendMessage({ type: Msg.INITED, data: state });
        break;

      case Msg.UPDATE_PERSISTENT_STATE:
        const tMsg = msg as MsgPayload<Payload_UpdatePersistentState>;
        chrome.storage.local.set({
          [APP_STATE_SELECTION_ID]: tMsg.data.selectedProjectId,
          [APP_STATE_SELECTION_IDX]: tMsg.data.selectedProjectIndex,
        });
        break;

      case Msg.SAVE_SCREEN_TO_PROJECT:
        await serializeDoc();
        break;

      default:
        break;
    }
  }
);

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-screen") {
    serializeDoc();
  }
});

async function serializeDoc() {
  const tab = await getActiveTab();
  if (!(tab && tab.id)) {
    throw new Error("Active tab not found. Are you focused on the browser?");
  }

  // Cross origin frames document are not accessible because of CORS hence we inject separate scripts to all
  // cross origin frames. The same origin frames are read from inside the the parent frame itself
  const framesInPage = (await chrome.webNavigation.getAllFrames({
    tabId: tab.id,
  })) || [];
  const crossOriginFrameIds: Array<number> = [];
  for (const frame of framesInPage) {
    if (frame.frameId === 0 || isCrossOrigin(tab.url || "", frame.url)) {
      // Will inject content script to main frame (frameId==0) as well as all cross origin frames
      crossOriginFrameIds.push(frame.frameId);
    }
  }

  const results = await chrome.scripting.executeScript<Array<any>, SerDoc>({
    target: { tabId: tab.id, frameIds: crossOriginFrameIds },
    func: getSearializedDom,
  });

  for (const r of results) {
    r.result.docTree = JSON.parse(r.result.docTreeStr);
  }

  const mainFrame = await postProcessSerDocs(results);
  console.log(">>> MAIN", mainFrame);
}

function resolveElementFromPath(node: SerNode, path: Array<number>): SerNode {
  const idx = path.shift();
  if (idx !== undefined) {
    return resolveElementFromPath(node.chldrn[idx], path);
  }
  return node;
}

function getFrameIdentifer(
  name: string | undefined | null,
  href: string | undefined | null
): string {
  return `${name || ""}::${href || ""}`;
}

type LookupWithPropType = "name" | "url" | "dim";
class CreateLookupWithProp<T> {
  private rec: Record<LookupWithPropType, Record<string, T[]>> = {
    name: {},
    url: {},
    dim: {},
  };

  push = (prop: LookupWithPropType, key: string, val: T) => {
    if (key in this.rec) {
      this.rec[prop][key].push(val);
    } else {
      this.rec[prop][key] = [val];
    }
  };

  find = (prop: LookupWithPropType, key: string | null | undefined): T[] => {
    if (key === null || key === undefined) {
      key = "";
    }
    if (!(key in this.rec[prop])) {
      return [];
    }

    return this.rec[prop][key];
  };
}

type FrameResult = chrome.scripting.InjectionResult<SerDoc>;
async function postProcessSerDocs(
  results: Array<chrome.scripting.InjectionResult<SerDoc>>
): Promise<SerDoc> {
  let mainFrame;
  const framesByName: Record<string, FrameResult> = {};
  const domains = [];
  const lookupWithProp = new CreateLookupWithProp<FrameResult>();
  for (const r of results) {
    if (r.frameId === 0) {
      mainFrame = r;
    } else {
      lookupWithProp.push("name", r.result.name, r);
      lookupWithProp.push("url", r.result.frameUrl, r);
      lookupWithProp.push(
        "dim",
        `${r.result.rect.width}:${r.result.rect.height}`,
        r
      );
    }
  }

  if (!(mainFrame && mainFrame.result)) {
    throw new Error("Main frame not found, this should never happen");
  }

  const allCookies = await chrome.cookies.getAll({});
  async function process(frame: SerDoc) {
    for (const postProcess of frame.postProcesses) {
      const traversalPath = postProcess.path.split(".").map((_) => +_);
      const node = resolveElementFromPath(frame.docTree!, traversalPath);
      if (postProcess.type === "iframe") {
        // const key = getFrameIdentifer(node.attrs.name, node.attrs.src);
        // const subFrame = frames[key];

        let subFrame;
        let subFrames = [];
        if (
          (subFrames = lookupWithProp.find("name", node.attrs.name)).length
          === 1
        ) {
          // If we find an unique frame record with name then we take it
          // Sometimes the <iframe name="" /> is blank, in that case we do following lookup
          subFrame = subFrames[0];
        } else if (
          (subFrames = lookupWithProp.find("url", node.attrs.src)).length === 1
        ) {
          // If we find an unique frame record with url then we take the entry
          // Sometimes the <iframe src="" /> from inside iframe
          subFrame = subFrames[0];
        } else if (
          node.props.rect
          && (subFrames = lookupWithProp.find(
            "dim",
            `${node.props.rect.width}:${node.props.rect.height}`
          )).length === 1
        ) {
          // If none of the above condition matches we try to get iframe with same dimension
          subFrame = subFrames[0];
        }

        if (!subFrame) {
          console.warn("Node", node);
          console.warn("No subframe present for node ^^^");
        } else {
          node.chldrn.push(subFrame.result.docTree!);
          process(subFrame.result);
        }
      } else {
        const url = new URL(frame.frameUrl);
        const cookieStr = getCookieHeaderForUrl(allCookies, url);
        const clientInfo = btoa(
          JSON.stringify({
            kie: cookieStr,
            ua: frame.userAgent,
          })
        );
        const data = await api("/proxyasset", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: getAbsoluteUrl(node.attrs.href || "", frame.baseURI),
            projectId: 1,
            assumedFileExt: node.props.fileExt,
            clientInfo,
          }),
        });
        node.props.origHref = node.attrs.href;
        node.attrs.href = (data as any).data.proxyUri;
        /* Make request to server to save the static asset and return result
         *
         * api('/storeasset', {
         *  method: POST,
         *  cookie:
         *  assumedName:
         *  url:
         *  referrer:
         * })
         */
      }
    }
  }

  await process(mainFrame.result);
  return mainFrame.result;
}

import { ApiResp, ReqProxyAsset, ReqNewScreen, RespProxyAsset, RespScreen } from "@fable/common/dist/api-contract";
import api from "@fable/common/dist/api";
import { getActiveTab, sleep } from "./common";
import { getSearializedDom, SerDoc, SerNode } from "./doc";
import { Msg, MsgPayload } from "./msg";
import { IExtStoredState, IUser } from "./types";
import { getAbsoluteUrl, getCookieHeaderForUrl, isCrossOrigin } from "./utils";

const APP_STATE_IDENTITY = "app_state_identity";

async function getPersistentExtState(): Promise<IExtStoredState> {
  const identity = (await chrome.storage.local.get(APP_STATE_IDENTITY))[APP_STATE_IDENTITY] as IUser | undefined;

  return {
    identity: identity || null,
  };
}

async function addSampleUser() {
  const sampleUser = {
    id: 1,
    belongsToOrg: {
      rid: "",
    },
  };
  await chrome.storage.local.set({
    [APP_STATE_IDENTITY]: sampleUser,
  });
}

chrome.runtime.onMessage.addListener(async (msg: MsgPayload<any>, sender, sendResponse) => {
  switch (msg.type) {
    case Msg.INIT: {
      const state = await getPersistentExtState();
      chrome.runtime.sendMessage({ type: Msg.INITED, data: state });
      break;
    }

    case Msg.SAVE_SCREEN: {
      await serializeDoc();
      break;
    }

    case Msg.ADD_SAMPLE_USER: {
      await addSampleUser();
      const state = await getPersistentExtState();
      chrome.runtime.sendMessage({ type: Msg.INITED, data: state });
      break;
    }

    default:
      break;
  }
});

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
async function postProcessSerDocs(results: Array<FrameResult>): Promise<SerDoc> {
  let mainFrame;
  let iconPath: string | undefined;
  const lookupWithProp = new CreateLookupWithProp<FrameResult>();
  for (const r of results) {
    if (r.frameId === 0) {
      mainFrame = r;
    } else {
      lookupWithProp.push("name", r.result.name, r);
      lookupWithProp.push("url", r.result.frameUrl, r);
      lookupWithProp.push("dim", `${r.result.rect.width}:${r.result.rect.height}`, r);
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
        let subFrame;
        let subFrames = [];
        if ((subFrames = lookupWithProp.find("name", node.attrs.name)).length === 1) {
          // If we find an unique frame record with name then we take it
          // Sometimes the <iframe name="" /> is blank, in that case we do following lookup
          subFrame = subFrames[0];
        } else if ((subFrames = lookupWithProp.find("url", node.attrs.src)).length === 1) {
          // If we find an unique frame record with url then we take the entry
          // Sometimes the <iframe src="" /> from inside iframe
          subFrame = subFrames[0];
        } else if (
          node.props.rect
          && (subFrames = lookupWithProp.find("dim", `${node.props.rect.width}:${node.props.rect.height}`)).length === 1
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

        const assetUrlStr = getAbsoluteUrl(node.attrs.href || "", frame.baseURI);
        const assetUrl = new URL(assetUrlStr);
        if (assetUrl.protocol === "http:" || assetUrl.protocol === "https:") {
          const data = await api<ReqProxyAsset, ApiResp<RespProxyAsset>>("/proxyasset", {
            method: "POST",
            body: {
              origin: assetUrlStr,
              clientInfo,
            },
          });
          node.props.origHref = node.attrs.href;
          node.attrs.href = data.data.proxyUri;
        }

        if (postProcess.path === frame.icon?.path) {
          iconPath = node.attrs.href || undefined;
        }
      }
    }
  }

  await process(mainFrame.result);
  const imageData = await chrome.tabs.captureVisibleTab();
  const data = await api<ReqNewScreen, ApiResp<RespScreen>>("/newscreen", {
    method: "POST",
    body: {
      name: mainFrame.result.title,
      url: mainFrame.result.frameUrl,
      thumbnail: imageData,
      body: JSON.stringify(mainFrame.result),
      favIcon: iconPath,
    },
  });

  return mainFrame.result;
}

import { Msg, MsgPayload, Payload_UpdatePersistentState } from "./msg";
import api from "./api";
import { getSearializedDom } from "./doc";
import { IExtStoredState, IProject } from "./types";
import { getActiveTab } from "./common";

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
        await getCurrentScreen();
        break;

      default:
        break;
    }
  }
);

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-screen") {
    getCurrentScreen();
  }
});

async function getCurrentScreen() {
  const tab = await getActiveTab();
  if (!(tab && tab.id)) {
    throw new Error("Active tab not found. Are you focused on the browser?");
  }
  const results = await injectScript(tab.id);
  for (const result of results) {
    console.log(">> result", result);
  }
}

function injectScript(tabId: number): Promise<any> {
  return chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: getSearializedDom,
  });
}

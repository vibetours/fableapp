import {
  ApiResp,
  ReqNewScreen,
  ReqProxyAsset,
  RespProxyAsset,
  RespScreen,
} from "@fable/common/dist/api-contract";
import api from "@fable/common/dist/api";
import {
  ScreenData,
  SerDoc,
  SerNode,
} from "@fable/common/dist/types";
import { snowflake } from "@fable/common/dist/utils";
import { getActiveTab } from "./common";
import { Msg, MsgPayload } from "./msg";
import {
  IExtStoredState,
  IUser,
  ReqScreenshotData,
  ScreenSerDataFromCS,
  ScriptInitReportedData,
  ScriptInitRequiredData,
  SerializeFrameData,
  StopRecordingData
} from "./types";
import { getAbsoluteUrl, getCookieHeaderForUrl, isCrossOrigin } from "./utils";

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_APP_CLIENT_ENDPOINT as string;

const APP_STATE_IDENTITY = "app_state_identity";
const APP_RECORDING_STATE = "app_state_recording";
const FRAMES_TO_PROCESS = "frames_to_process";
const TABS_TO_TRACK = "app_update_listnr_for_tab_ids";
const FRAMES_IN_TAB = "frames_in_tab";
const SCREEN_DATA_FINISHED = "screen_data_finished";

const enum RecordingStatus {
  Idle = 1,
  Started,
}

interface ScreenInfo {
  id: number;
  elPath: string;
}

interface FrameDataToBeProcessed {
  oid: number;
  frameId: number;
  tabId: number;
  type: "serdom" | "thumbnail" | "sigstop";
  data: SerDoc | string;
}

const LOCKS: Record<string, number> = {};
async function acquireLock(key: string) {
  return new Promise(resolve => {
    const timer = setInterval(async () => {
      const isLockAlreadyAcquired = LOCKS[key];
      if (isLockAlreadyAcquired) {
        // wait, until the lock is released
      } else {
        LOCKS[key] = 1;
        clearTimeout(timer);
        resolve(1);
      }
    }, 5);
  });
}

async function releaseLock(key: string) {
  delete LOCKS[key];
}

async function addFrameDataToProcessList(id: number, frameDataToProcess: FrameDataToBeProcessed): Promise<void> {
  const key = `${FRAMES_TO_PROCESS}/${id}`;
  await acquireLock(key);
  const allFramesToProcess = (await chrome.storage.local.get(key))[key] || [];
  allFramesToProcess.push(frameDataToProcess);
  await chrome.storage.local.set({
    [key]: allFramesToProcess,
  });
  await releaseLock(key);
}

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;
  for (const [storageKey, { newValue: val }] of Object.entries(changes)) {
    if (storageKey.startsWith(FRAMES_TO_PROCESS) && val) {
      const framesInTab = (await chrome.storage.local.get(FRAMES_IN_TAB))[FRAMES_IN_TAB] || {};
      const tVal = val as FrameDataToBeProcessed[];
      let allFramesRecorded = false;
      let isThumbnailCaptured = false;
      let isSessionFinished = false;
      const tabId = tVal[0].tabId;
      const frames = (framesInTab[tabId] as number[]).reduce((s, n) => {
        s[n] = 1;
        return s;
      }, {} as Record<number, number>);
      for (const item of tVal) {
        if (item.type === "thumbnail") {
          isThumbnailCaptured = true;
        } else if (item.type === "sigstop") {
          isSessionFinished = true;
        } else {
          delete frames[item.frameId];
        }
      }
      allFramesRecorded = Object.keys(frames).length === 0;
      if (!allFramesRecorded || !isThumbnailCaptured) {
        return;
      }

      const key = SCREEN_DATA_FINISHED;
      await acquireLock(key);
      const finishedScreens = (await chrome.storage.local.get(SCREEN_DATA_FINISHED))[SCREEN_DATA_FINISHED] || [];
      finishedScreens.push(tVal);
      await chrome.storage.local.set({
        [SCREEN_DATA_FINISHED]: finishedScreens,
      });
      await chrome.storage.local.remove(storageKey);
      await releaseLock(key);

      if (isSessionFinished) {
        await chrome.storage.local.set({
          [FRAMES_IN_TAB]: {},
        });
        try {
          const newTab = await chrome.tabs.create({
            url: `${APP_CLIENT_ENDPOINT}/createTour`
          });

          await chrome.scripting.executeScript({
            target: { tabId: newTab.id! },
            files: ["client_content.js"],
          });
        } catch (e) {
          const debugData = await chrome.storage.local.get(null);
          console.warn(">>> DEBUG DATA <<<", debugData);
          throw e;
        } finally {
          await resetAppState();
        }
      }
    }
  }
});

async function resetAppState(): Promise<void> {
  const tabsThatWasBeingTracked = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  await Promise.all([
    ...Object.keys(tabsThatWasBeingTracked).map(tabId => chrome.tabs.reload(+tabId)),
    // chrome.storage.local.clear(),
    chrome.storage.local.set({
      [APP_RECORDING_STATE]: RecordingStatus.Idle,
      [TABS_TO_TRACK]: {},
    }),
  ]);
}

async function getPersistentExtState(): Promise<IExtStoredState> {
  const identity = (await chrome.storage.local.get(APP_STATE_IDENTITY))[APP_STATE_IDENTITY] as IUser | undefined;
  const recordingStatus = (await chrome.storage.local.get(APP_RECORDING_STATE))[APP_RECORDING_STATE]
    || RecordingStatus.Idle;

  return {
    identity: identity || null,
    isRecordingStarted: recordingStatus === RecordingStatus.Started
  };
}

// TODO until login is implemented
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

/**
 * This is how auto stitching of screens works based on user interaction
 *
 * A tab can have multiple frames (iframes). Each frame works as a separate browsing context. The content script is
 * injected to the top frame (frameId == 0) and all the cross-origin frames.
 *
 * Once the content script is injected, it registers listeners to be able to connect to the background page via
 * messaging, and it installs onclick listener on body during the capture phase of the event. Note, for the same
 * origin frame within a frame where the content script is injected, further onclick listeners are added. We don't
 * inject content script to same-origin frames.
 *
 * Every time user clicks on an element of a frame we serialize the whole frame by hooking on to the capture event
 * as mentioned above. The source frame where the interaction has happened, then sends a message to background page with
 * serialized json (for that frame) with `{ eventType: 'source' }`. This is to identify the originating frame where
 * the event has occurred. At this point we have a partial view of the tab, where serialization happened only for one
 * frame (out of many other frames) in the tab.
 *
 * Once the source event has reached to background page, background page asks all the other frames on the same tab to
 * pass their respective serialized json. We call this event { eventType: 'cascade' }. This time all the frame but the
 * originating frame passes their respective serialized json.
 *
 * Once we receive all the serialized json from the frames, we conclude that serialization of the whole tab is
 * completed.
 *
 * We need to uniquely identify the serialized json across multiple interaction, for that an id is generated that is
 * of kind [snowflake](https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake). These are loosely
 * monotonically increasing ids that can be out of order if they were generated inside 1ms. This id is passed back
 * and forth via messaging.
 */
chrome.runtime.onMessage.addListener(async (msg: MsgPayload<any>, sender) => {
  switch (msg.type) {
    case Msg.INIT: {
      const state = await getPersistentExtState();
      await chrome.runtime.sendMessage({
        type: Msg.INITED,
        data: state
      });
      break;
    }

    case Msg.TAKE_SCREENSHOT: {
      const tMsg = msg as MsgPayload<ReqScreenshotData>;
      // Only take screenshot of the tab once
      if (sender.frameId === 0) {
        await addFrameDataToProcessList(tMsg.data.id, {
          oid: tMsg.data.id,
          frameId: 0,
          tabId: sender.tab!.id!,
          type: "thumbnail",
          data: await chrome.tabs.captureVisibleTab(),
        });
      }
      break;
    }

    case Msg.SCRIPT_INIT: {
      // Exchanges data that are not accessible in content script by default, and needed to be passed from background
      // script like frameId
      const tMsg = msg as MsgPayload<ScriptInitRequiredData>;
      if (sender.tab && sender.tab.id) {
        await chrome.tabs.sendMessage<MsgPayload<ScriptInitReportedData>>(
          sender.tab.id!,
          { type: Msg.SCRIPT_INIT_DATA, data: { frameId: sender.frameId || 0, scriptId: tMsg.data.scriptId } }
        );
      }
      break;
    }

    case Msg.FRAME_SERIALIZED: {
      const tMsg = msg as MsgPayload<ScreenSerDataFromCS>;
      const frameId = sender.frameId === undefined ? -1 : sender.frameId;
      if (tMsg.data.eventType === "source") {
        await chrome.tabs.sendMessage<MsgPayload<SerializeFrameData>>(
          sender.tab!.id!,
          { type: Msg.SERIALIZE_FRAME, data: { srcFrameId: frameId, id: tMsg.data.id } }
        );
      }
      await addFrameDataToProcessList(tMsg.data.id, {
        frameId,
        oid: tMsg.data.id,
        tabId: sender.tab!.id!,
        type: "serdom",
        data: tMsg.data.serDoc
      });
      break;
    }
    case Msg.START_RECORDING: {
      await resetAppState();
      await chrome.storage.local.set({
        [APP_RECORDING_STATE]: RecordingStatus.Started,
      });
      await startRecording();
      break;
    }

    case Msg.STOP_RECORDING: {
      await chrome.storage.local.set({
        [APP_RECORDING_STATE]: RecordingStatus.Idle,
      });
      await stopRecording();
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const id = snowflake();
      // this has to be the first message for us to know that messagw with the following id gonna be the last
      // interaction
      await addFrameDataToProcessList(id, {
        frameId: 0,
        oid: id,
        tabId: tab.id!,
        type: "sigstop",
        data: ""
      });
      await chrome.tabs.sendMessage<MsgPayload<StopRecordingData>>(tab.id!, {
        type: Msg.STOP_RECORDING,
        data: { id }
      });
      clearLoadingIcon(tab.id!);
      break;
    }

    case Msg.ADD_SAMPLE_USER: {
      await addSampleUser();
      const state = await getPersistentExtState();
      await chrome.runtime.sendMessage({ type: Msg.INITED, data: state });
      break;
    }

    case Msg.CLIENT_CONTENT_INIT: {
      if (!sender.tab) {
        break;
      }
      const data = await chrome.storage.local.get(SCREEN_DATA_FINISHED);
      const cookies = await chrome.cookies.getAll({});
      await chrome.tabs.sendMessage(sender.tab.id!, {
        type: Msg.SAVE_TOUR_DATA,
        data: { screensData: data[SCREEN_DATA_FINISHED] || [], cookies }
      });
      await chrome.storage.local.remove(SCREEN_DATA_FINISHED);
      break;
    }

    default:
      break;
  }
});

function showLoadingIcon(tabId: number) {
  return Promise.all([
    chrome.action.setBadgeText({
      tabId,
      text: "....",
    }),
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: "#FEDF64"
    })
  ]);
}

function clearLoadingIcon(tabId: number) {
  chrome.action.setBadgeText({
    tabId,
    text: "",
  });
}

async function injectContentScriptInCrossOriginFrames(tab: { id: number, url: string }) {
  // Cross-origin frames document are not accessible because of CORS hence we inject separate scripts to all
  // cross-origin frames. The same origin frames are read from inside the parent frame itself
  const framesInPage = (await chrome.webNavigation.getAllFrames({
    tabId: tab.id,
  })) || [];
  const crossOriginFrameIds: Array<number> = [];
  for (const frame of framesInPage) {
    if (frame.frameId === 0 || isCrossOrigin(tab.url || "", frame.url)) {
      // Will inject content script to main frame (frameId==0) as well as all cross-origin frames
      crossOriginFrameIds.push(frame.frameId);
    }
  }

  const framesInTab = (await chrome.storage.local.get(FRAMES_IN_TAB))[FRAMES_IN_TAB] || {};
  framesInTab[`${tab.id}`] = crossOriginFrameIds;
  await chrome.storage.local.set({ [FRAMES_IN_TAB]: framesInTab });
  await chrome.scripting.executeScript<Array<any>, SerDoc>({
    target: { tabId: tab.id, frameIds: crossOriginFrameIds },
    files: ["content.js"],
  });
}

async function onTabStateUpdate(tabId: number, info: chrome.tabs.TabChangeInfo) {
  const tabsToLookFor = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  if (info.status === "complete" && tabId in tabsToLookFor) {
    const urlStats = await getTabUrlStats(tabId);
    tabsToLookFor[tabId] = urlStats.url;
    await chrome.storage.local.set({
      [TABS_TO_TRACK]: tabsToLookFor
    });
    if (urlStats.isValid) {
      await injectContentScriptInCrossOriginFrames({ id: tabId, url: urlStats.url });
    }
  }
}

async function getTabUrlStats(tabId: number) {
  const stats = {
    isValid: false,
    url: "",
  };

  const tab = await chrome.tabs.get(tabId);
  if (!tab) return stats;

  const url = tab.url;
  if (!url) return stats;

  const u = new URL(url);
  if (u.protocol !== "https:") {
    stats.url = url;
    return stats;
  }

  stats.isValid = true;
  stats.url = url;
  return stats;
}

async function onTabActive(activeInfo: chrome.tabs.TabActiveInfo) {
  const tabsToLookFor = (await chrome.storage.local.get(TABS_TO_TRACK))[TABS_TO_TRACK] || {};
  if (activeInfo.tabId in tabsToLookFor) {
    return;
  }

  const urlStats = await getTabUrlStats(activeInfo.tabId);
  tabsToLookFor[activeInfo.tabId] = urlStats.url;

  await chrome.storage.local.set({
    [TABS_TO_TRACK]: tabsToLookFor
  });

  if (urlStats.isValid) {
    await injectContentScriptInCrossOriginFrames({ id: activeInfo.tabId, url: urlStats.url });
  }
}

async function startRecording(): Promise<void> {
  const tab = await getActiveTab();
  if (!(tab && tab.id)) {
    throw new Error("Active tab not found. Are you focused on the browser?");
  }

  chrome.tabs.onUpdated.addListener(onTabStateUpdate);
  chrome.tabs.onActivated.addListener(onTabActive);
  await Promise.all([
    await chrome.storage.local.set({
      [TABS_TO_TRACK]: { [tab.id]: tab.url }
    }),
    await showLoadingIcon(tab.id),
    await injectContentScriptInCrossOriginFrames({ id: tab.id!, url: tab.url! })
  ]);
}

async function stopRecording() {
  chrome.tabs.onUpdated.removeListener(onTabStateUpdate);
  chrome.tabs.onActivated.removeListener(onTabActive);
}

function resolveElementFromPath(node: SerNode, path: Array<number>): SerNode {
  const idx = path.shift();
  if (idx !== undefined) {
    return resolveElementFromPath(node.chldrn[idx], path);
  }
  return node;
}

type LookupWithPropType = "name" | "url" | "dim" | "frameId";
class CreateLookupWithProp<T> {
  private rec: Record<LookupWithPropType, Record<string, T[]>> = {
    name: {},
    url: {},
    dim: {},
    frameId: {},
  };

  static getNormalizedUrlStr(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      urlStr = `${url.origin}${url.pathname}`;
    } catch (e) {
      /* noop */
    }
    return urlStr;
  }

  push = (prop: LookupWithPropType, key: string, val: T) => {
    if (prop === "url") {
      key = CreateLookupWithProp.getNormalizedUrlStr(key);
    }
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
    if (prop === "url") {
      key = CreateLookupWithProp.getNormalizedUrlStr(key);
    }
    if (!(key in this.rec[prop])) {
      return [];
    }

    return this.rec[prop][key];
  };
}

import {
  StorageKeys,
  ENetworkEvents,
  IRuntimeMsg,
  NNetworkEvents,
  RecordingStatus,
  SerializablePayload,
} from './types';
import ReqProcessingSynchronizer from './req_processing_sync';
import * as persistence from './persistence';
import { getRandomId } from './utils';

// TODO report all the requests during recording for debugging purpose
// TODO with post data
// TODO error handling for await statements

export function log(...msg: Array<any>) {
  console.log(...msg);
}

const SkipReqForMethods = {
  Options: 1,
  Head: 1,
};

const SkipReqForHost = {
  'ingest.sentry.io': 1,
  'google-analytics.com': 1,
};

const SkipReqForProtocol = {
  'data:': 1,
  'blob:': 1,
  'chrome-extensin:': 1,
};

async function getRespBody(tabId: number, reqId: string) {
  return chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', {
    requestId: reqId,
  });
}

function onNetworkEvts(sync: ReqProcessingSynchronizer) {
  return async function (tab: chrome.debugger.Debuggee, eventStr: String, dataObj: Object | undefined) {
    // If the request is coming from tab which is not being recorded then skip the details
    const recordedTabs = await persistence.getTabsBeingRecorded();
    if (!tab || !tab.tabId || !(tab.tabId in recordedTabs)) {
      return;
    }

    const event = eventStr as ENetworkEvents;
    if (event === ENetworkEvents.RequestWillbeSent) {
      const reqData = dataObj as NNetworkEvents.IReqWillBeSentData;
      const url = new URL(reqData.request.url);

      // If the request is coming from the target tab but is not coming from document then don't process the response.
      // This might happen if the request is coming from extension page etc
      const allowedHosts = await persistence.getAllowedHost();
      if (!(url.host in allowedHosts)) {
        sync.ignore(reqData.requestId);
        return;
      }

      let skipped = false;
      if (
        reqData.request.method in SkipReqForMethods
        || url.host in SkipReqForHost
        || url.protocol in SkipReqForProtocol
      ) {
        sync.ignore(reqData.requestId);
        skipped = true;
      }

      console.log(reqData.requestId, reqData.request.url);
      if (reqData.redirectHasExtraInfo && reqData.redirectResponse && reqData.redirectResponse.status === 302) {
        const lock = sync.getLock(reqData.requestId);
        await lock?.respReceivedExtraInfo.p;
        console.log(reqData.requestId, reqData.request.url, 'reqwillbesent redirect');
        sync.deriveNewLock(reqData.requestId);

        const storedReq = (await persistence.getReqMeta(tab.tabId, reqData.requestId)) as SerializablePayload;
        await persistence.addToUploadQ(sync, {
          ...storedReq,
          contentType: reqData.request.headers['content-type'] || reqData.request.headers['Content-Type'],
        });

        // TODO store the request here
        log('TODO data.redirectHasExtraInfo is true');
      }

      // If the request is saved already, don't save it again.
      // If a single get request is sent multiple time then save it just once
      // if (reqData.request.method === 'GET') {
      //   if (sync.isCommited(reqData.request.url)) {
      //     sync.ignore(reqData.requestId);
      //     return;
      //   }
      //   sync.commit(reqData.request.url);
      // }

      await persistence.setReqData(tab.tabId, reqData.requestId, {
        origin: reqData.documentURL,
        method: reqData.request.method,
        url: reqData.request.url,
        reqHeaders: reqData.request.headers,
        meta: { skipped },
        // TODO post data
      });

      const lock = sync.getLock(reqData.requestId);
      lock?.reqWillBeSent.resolve();
    } else if (event === ENetworkEvents.RespReceivedExtraInfo) {
      const respData = dataObj as NNetworkEvents.IRespReceivedExtraInfo;
      const lock = sync.getLock(respData.requestId);
      if (!lock) {
        return;
      }

      try {
        await lock.reqWillBeSent.p;
        // only during redirect save the header to the original request
        if (respData.statusCode === 302) {
          console.log('RespReceivedExtraInfo', respData.requestId);
          await persistence.setReqData(tab.tabId, respData.requestId, {
            redirectHeaders: respData.headers,
            status: respData.statusCode,
          });
        }
        lock.respReceivedExtraInfo.resolve();
      } catch {
        lock.respReceivedExtraInfo.reject();
      }
    } else if (event === ENetworkEvents.ResponseReceived) {
      const respData = dataObj as NNetworkEvents.IRespReceivedData;
      const lock = sync.getLock(respData.requestId);
      if (!lock) {
        return;
      }
      try {
        await lock.reqWillBeSent.p;
        // console.log('ResponseReceived', respData.requestId);
        await persistence.setReqData(tab.tabId, respData.requestId, {
          contentType:
            respData.response.mimeType
            || respData.response.headers['Content-Type']
            || respData.response.headers['content-type'],
          respHeaders: respData.response.headers,
          status: respData.response.status,
        });
        lock.respReceived.resolve();
      } catch {
        lock.respReceived.reject();
      }
    } else if (event === ENetworkEvents.LoadingFinished) {
      const finishedData = dataObj as NNetworkEvents.IBaseXhrNetData;
      const lock = sync.getLock(finishedData.requestId);
      if (!lock) {
        return;
      }
      await lock.respReceived.p;
      const savedReq = (await persistence.getReqMeta(tab.tabId, finishedData.requestId)) as SerializablePayload;
      try {
        const resp = await getRespBody(tab.tabId, finishedData.requestId);
        await persistence.addToUploadQ(sync, { ...savedReq, respBody: resp });

        // console.log('===========================================');
        // console.log(resp);
        // console.log('===========================================');
      } catch (e) {
        console.log('Error while fetching response', e, savedReq, finishedData);
      } finally {
        sync.release((dataObj as any).requestId);
      }
    }
  };
}

async function startRecordingPage(tab: chrome.tabs.Tab, shouldReload = true) {
  await persistence.addToTabsBeingRecordedList(tab.id as number);
  await chrome.debugger.attach({ tabId: tab.id }, '1.0');
  await chrome.debugger.sendCommand({ tabId: tab.id }, 'Network.enable');
  if (shouldReload) {
    await chrome.tabs.reload(tab.id as number);
  }
}

async function onNewTabCreation(tab: chrome.tabs.Tab) {
  if (!tab.id) {
    return;
  }
  const lastActiveTabId = await persistence.getLastActiveTab();
  if (lastActiveTabId !== null) {
    const tabsBeingRecorded = await persistence.getTabsBeingRecorded();
    if (lastActiveTabId in tabsBeingRecorded) {
      startRecordingPage(tab, false);
    }
  } else {
    throw new Error('Active tab is null. This should never happen.');
  }
}

async function onTabUpdate(tabId: number, changeInfo: any, tab: chrome.tabs.Tab) {
  const recordedTabs = await persistence.getTabsBeingRecorded();
  if (tabId in recordedTabs && changeInfo.url) {
    await persistence.setAllowedHost(tab);
  }
}

async function onNewTabDeletion(tabId: number) {
  await persistence.removeFromTabsBeingRecordedList(tabId);
  await chrome.debugger.detach({ tabId });
}

async function onTabActivation(tab: chrome.tabs.TabActiveInfo) {
  await persistence.setLastActiveTab(tab.tabId);
}

async function processRequestsInQueue(sync: ReqProcessingSynchronizer) {
  const [reqs, moreUploadPending] = await persistence.getFromUploadQ(sync, 10);
  const ids = Object.keys(reqs);
  if (ids.length) {
    console.log(reqs);
    await persistence.removeFromQ(sync, ids);
  }

  console.log('na');
  if (moreUploadPending || (await persistence.getRecordingStatus()) !== RecordingStatus.Idle) {
    startQueueProcessing(sync);
  }
}

async function startQueueProcessing(sync: ReqProcessingSynchronizer) {
  const timer = await chrome.storage.session.get(StorageKeys.RunningTimer);
  const timerId = timer[StorageKeys.RunningTimer];
  if (timerId) clearTimeout(timerId);
  const id = setTimeout(async () => {
    await processRequestsInQueue(sync);
  }, 1000);
  await chrome.storage.session.set({ [StorageKeys.RunningTimer]: id });
}

// TODO all the msg type move to enum once the popup js ported to typescript
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'fable_ext_popup') {
    port.onMessage.addListener(async (msg: IRuntimeMsg) => {
      let activeTab: chrome.tabs.Tab;
      let tabsBeingRecorded: Array<string>;
      let sync: ReqProcessingSynchronizer;
      switch (msg.type) {
        case 'query_status':
          port.postMessage({ type: 'query_status', payload: { value: await persistence.getRecordingStatus() } });
          break;

        case 'record':
          await persistence.setRecordingStatus(RecordingStatus.Recording);

          activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
          if (!(activeTab && activeTab.id)) {
            // TODO Send this error to popup js
            throw new Error('Active tab should not be null');
          }

          await persistence.setLastActiveTab(activeTab.id);
          chrome.tabs.onCreated.addListener(onNewTabCreation);
          chrome.tabs.onRemoved.addListener(onNewTabDeletion);
          chrome.tabs.onActivated.addListener(onTabActivation);
          chrome.tabs.onUpdated.addListener(onTabUpdate);

          await persistence.setAllowedHost(activeTab);

          // TODO If a recording is already in progress then show some ui warning
          sync = new ReqProcessingSynchronizer();
          await startQueueProcessing(sync);
          await startRecordingPage(activeTab);
          chrome.debugger.onEvent.addListener(onNetworkEvts(sync));
          break;

        case 'stop':
          tabsBeingRecorded = Object.keys(await persistence.getTabsBeingRecorded());
          await Promise.all(tabsBeingRecorded.map((tabId) => chrome.debugger.detach({ tabId: +tabId })));
          await persistence.clearTabsBeingRecorded();

          await persistence.setRecordingStatus(RecordingStatus.Idle);
          chrome.tabs.onCreated.removeListener(onNewTabCreation);
          chrome.tabs.onRemoved.removeListener(onNewTabDeletion);
          chrome.tabs.onActivated.removeListener(onTabActivation);
          chrome.tabs.onUpdated.removeListener(onTabUpdate);

          // TODO cleanup all storage, debugger etc..
          break;

        default:
          break;
      }
    });
  }
});

import { StorageKeys, ENetworkEvents, IRuntimeMsg, NNetworkEvents, RecordingStatus, NSerReqResp } from './types';
import * as persistence from './persistence';
import { getRandomId, ReqProcessingSynchronizer, isUndefNull } from './utils';

// TODO report all the requests during recording for debugging purpose
// TODO with post data

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

      if (
        reqData.request.method in SkipReqForMethods
        || url.host in SkipReqForHost
        || url.protocol in SkipReqForProtocol
      ) {
        sync.ignore(reqData.requestId);
        return;
      }

      // If the request is saved already, don't save it again.
      // If a single get request is sent multiple time then save it just once
      if (reqData.request.method === 'GET') {
        if (sync.isCommited(reqData.request.url)) {
          sync.ignore(reqData.requestId);
          return;
        }
        sync.commit(reqData.request.url);
      }

      const data = {} as NSerReqResp.IReqWillBeSent;
      if (reqData.redirectHasExtraInfo && reqData.redirectResponse && reqData.redirectResponse.status === 302) {
        data.redirectResponse = {
          headers: reqData.redirectResponse.headers,
          status: reqData.redirectResponse.status,
          url: reqData.redirectResponse.url,
          isRedirect: true,
        };
      }
      data.origin = reqData.documentURL;
      data.method = reqData.request.method;
      data.url = reqData.request.url;
      data.reqHeaders = reqData.request.headers;
      data.requestId = reqData.requestId;
      data.timestamp = reqData.timestamp;
      data.event = ENetworkEvents.RequestWillbeSent;
      data.requestId = reqData.requestId;
      data.tabId = tab.tabId;

      persistence.setNetData(tab.tabId, reqData.requestId, data);
    } else if (event === ENetworkEvents.ResponseReceived) {
      const respData = dataObj as NNetworkEvents.IRespReceivedData;
      if (sync.shouldIgnore(respData.requestId)) {
        return;
      }

      const data = {} as NSerReqResp.IRespReceived;
      data.contentType = respData.response.mimeType
        || respData.response.headers['Content-Type']
        || respData.response.headers['content-type'];
      data.respHeaders = respData.response.headers;
      data.status = respData.response.status;
      data.timestamp = respData.timestamp;
      data.event = ENetworkEvents.ResponseReceived;

      persistence.setNetData(tab.tabId, respData.requestId, data);
    } else if (event === ENetworkEvents.LoadingFinished) {
      const finishedData = dataObj as NNetworkEvents.IBaseXhrNetData;
      if (sync.shouldIgnore(finishedData.requestId)) {
        return;
      }

      const data = {} as NSerReqResp.IBase;
      data.timestamp = finishedData.timestamp;
      data.event = ENetworkEvents.LoadingFinished;

      // WARN the final event is delayed so that if there are out of order events that could be managed
      // For some cases (redirection) ResponseReceived -> LoadingFinished event gets queued before all the
      // RequestWillbeSent event is received. This is delayed to handle that case in bruteforce fashion.
      // As part of solution, Add one more level of check by using ResponseReceivedExtraInfo to mark more
      // data is incoming
      // This issue will only appear for indirection
      // Note this is a very fragile check, if the second RequestWillbeSent comes after 750 seconds the same
      // problem would happen.
      // TODO fix this
      await sleep(750);
      persistence.setNetData(tab.tabId, finishedData.requestId, data);
    }
  };
}

const reqRespKeyLike = new RegExp(`${StorageKeys.PrefixReqRespData}/`);
const uploadKeyLike = new RegExp(`${StorageKeys.UploadQ}/`);
function onStorageChange(sync: ReqProcessingSynchronizer) {
  return async function (changeRaw: any, storageType: string) {
    if (storageType !== 'session') {
      return;
    }

    const change = changeRaw as Record<
      string,
      {
        oldValue: Array<NSerReqResp.IIncoming> | NSerReqResp.IOutgoing;
        newValue: Array<NSerReqResp.IIncoming> | NSerReqResp.IOutgoing;
      }
    >;
    const changeKeys = Object.keys(change);
    for (const key of changeKeys) {
      if (reqRespKeyLike.test(key)) {
        let values = change[key].newValue as Array<NSerReqResp.IIncoming>;
        if (values instanceof Array ? values.length < 3 : true) {
          // At least there would be three events, RequestWillbeSent, ResponseReceived, LoadingFinished for a request to
          // be fullfilled
          continue;
        }

        // Reorder the events as RequestWillbeSent -> ResponseReceived -> LoadingFinished
        values = [
          ...values
            .filter((e) => e.event === ENetworkEvents.RequestWillbeSent)
            .sort((m, n) => m.timestamp - n.timestamp),
          ...values.filter((e) => e.event === ENetworkEvents.ResponseReceived),
          ...values.filter((e) => e.event === ENetworkEvents.LoadingFinished),
        ];

        if (
          values[values.length - 1].event !== ENetworkEvents.LoadingFinished
          && values[values.length - 2].event !== ENetworkEvents.ResponseReceived
        ) {
          // The last event has to be ENetworkEvents.LoadingFinished for us to consider the processing is completed
          continue;
        }

        const reqWillBeSentEvent: Array<NSerReqResp.IReqWillBeSent> = [];
        let respReceivedEvent: NSerReqResp.IRespReceived | null = null;
        let loadingFinishedEvent: NSerReqResp.IBase;
        for (const item of values) {
          switch (item.event) {
            case ENetworkEvents.RequestWillbeSent:
              reqWillBeSentEvent.push(item as NSerReqResp.IReqWillBeSent);
              break;
            case ENetworkEvents.ResponseReceived:
              respReceivedEvent = item as NSerReqResp.IRespReceived;
              break;
            case ENetworkEvents.LoadingFinished:
              loadingFinishedEvent = item as NSerReqResp.IBase;
              break;
            default:
              break;
          }
        }
        // This means there is multiple RequestWillbeSent event (as there could be only one ResponseReceived &
        // LoadingFinished) event
        // This is the case where redirect has happened.
        const outgoingEvents: Array<NSerReqResp.IOutgoing> = [];

        const reqRedirectionPerUrl = reqWillBeSentEvent.reduce((store: any, evt) => {
          if (evt.redirectResponse) {
            store[`${evt.redirectResponse.url}`] = evt.redirectResponse;
          }
          return store;
        }, {}) as Record<string, NSerReqResp.IReqRedirectResp>;

        for (const evt of reqWillBeSentEvent) {
          if (evt.url in reqRedirectionPerUrl) {
            outgoingEvents.push({
              url: evt.url,
              method: evt.method,
              origin: evt.origin,
              reqHeaders: evt.reqHeaders,
              respResolveReqId: evt.requestId,
              respResolveTabId: evt.tabId,
              status: reqRedirectionPerUrl[evt.url].status,
              respHeaders: reqRedirectionPerUrl[evt.url].headers,
              contentType: '',
            });
          } else {
            outgoingEvents.push({
              url: evt.url,
              method: evt.method,
              origin: evt.origin,
              reqHeaders: evt.reqHeaders,
              respResolveReqId: evt.requestId,
              respResolveTabId: evt.tabId,
              status: respReceivedEvent?.status || -1,
              contentType: respReceivedEvent?.contentType || '',
              respHeaders: respReceivedEvent?.respHeaders || {},
            });
          }
        }

        sync.reqToUploadCount += outgoingEvents.length;
        outgoingEvents.forEach(async (evt) => {
          await chrome.storage.session.set({ [`${StorageKeys.UploadQ}/${getRandomId()}`]: evt });
        });
        chrome.storage.session.remove(key);
      } else if (uploadKeyLike.test(key)) {
        const value = change[key].newValue as NSerReqResp.IOutgoing;
        if (!value) {
          continue;
        }

        if (value.status === -1) {
          // This should not be the case
          console.log('status should not be -1.', value);
        } else if (value.status !== 302) {
          if (!(isUndefNull(value.respResolveReqId) || isUndefNull(value.respResolveTabId))) {
            const resp = (await getRespBody(value.respResolveTabId as number, value.respResolveReqId as string)) as {
              base64Encoded: boolean;
              body: string;
            };
            value.respBody = resp;
          }
        }

        delete value.respResolveReqId;
        delete value.respResolveTabId;
        console.log(value.url, value);
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
  // const [reqs, moreUploadPending] = await persistence.getFromUploadQ(sync, 10);
  // const ids = Object.keys(reqs);
  // if (ids.length) {
  //   console.log(reqs);
  //   await persistence.removeFromQ(sync, ids);
  // }
  // console.log('na');
  // if (moreUploadPending || (await persistence.getRecordingStatus()) !== RecordingStatus.Idle) {
  //   startQueueProcessing(sync);
  // }
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
      let sync2;
      let storageChangeFn;
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

          sync = new ReqProcessingSynchronizer();

          await persistence.setLastActiveTab(activeTab.id);
          chrome.tabs.onCreated.addListener(onNewTabCreation);
          chrome.tabs.onRemoved.addListener(onNewTabDeletion);
          chrome.tabs.onActivated.addListener(onTabActivation);
          chrome.tabs.onUpdated.addListener(onTabUpdate);
          storageChangeFn = onStorageChange(sync);
          chrome.storage.onChanged.addListener(storageChangeFn);

          await persistence.setAllowedHost(activeTab);

          // TODO If a recording is already in progress then show some ui warning
          // await startQueueProcessing(sync);
          await startRecordingPage(activeTab);
          chrome.debugger.onEvent.addListener(onNetworkEvts(sync));
          break;

        case 'stop':
          tabsBeingRecorded = Object.keys(await persistence.getTabsBeingRecorded());
          await Promise.all(tabsBeingRecorded.map((tabId) => chrome.debugger.detach({ tabId: +tabId })));
          await persistence.clearTabsBeingRecorded();

          await persistence.setRecordingStatus(RecordingStatus.Idle);
          storageChangeFn && chrome.storage.onChanged.removeListener(storageChangeFn);
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

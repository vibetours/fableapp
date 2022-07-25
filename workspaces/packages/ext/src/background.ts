import { StorageKeys, ENetworkEvents, IRuntimeMsg, NNetworkEvents } from './types';

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
};

// Persistence of data using chrome.storage.session
const persistance = {
  setRecordedTab: async (id: number) => {
    const list = await chrome.storage.session.get(StorageKeys.RecordedTabs);
    let recTabs: Array<number>;
    if (StorageKeys.RecordedTabs in list && (recTabs = list[StorageKeys.RecordedTabs]) instanceof Array) {
      recTabs.push(id);
    } else {
      recTabs = [id];
    }
    await chrome.storage.session.set({ [StorageKeys.RecordedTabs]: recTabs });
  },

  getRecordedTab: async (): Promise<Record<number, number>> => {
    const list = await chrome.storage.session.get(StorageKeys.RecordedTabs);
    const tabs = list[StorageKeys.RecordedTabs] as Array<number> | undefined;
    if (!tabs) {
      return {};
    }
    return tabs.reduce((store: Record<number, number>, v: number) => ((store[v] = 1), store), {});
  },

  // TODO take tab id as param and save it as a key
  // TODO exact type of data, not any
  setReqMeta: async (reqId: string, data: Record<string, any>) => {
    const key = `${StorageKeys.PrefixRequestMeta}_${reqId}`;
    const storedData = await chrome.storage.session.get(key);
    if (storedData[key]) {
      await chrome.storage.session.set({ [key]: { ...storedData, ...data } });
    } else {
      await chrome.storage.session.set({ [key]: data });
    }
  },

  // TODO exact type of data, not any
  getReqMeta: async (reqId: string): Promise<Record<string, any> | null> => {
    const key = `${StorageKeys.PrefixRequestMeta}_${reqId}`;
    const storedData = await chrome.storage.session.get(key);
    return storedData[key] || null;
  },
};

async function getRespBody(tabId: number, reqId: string) {
  return chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', {
    requestId: reqId,
  });
}

function onNetworkEvts() {
  return async function (tab: chrome.debugger.Debuggee, eventStr: String, dataObj: Object | undefined) {
    log(tab, eventStr, dataObj);
    // If the request is coming from tab which is not being recorded then skip the details
    const recordedTabs = await persistance.getRecordedTab();
    if (!tab || !tab.tabId || !(tab.tabId in recordedTabs)) {
      return;
    }

    const event = eventStr as ENetworkEvents;
    if (event === ENetworkEvents.RequestWillbeSent) {
      const reqData = dataObj as NNetworkEvents.IReqWillBeSentData;
      const url = new URL(reqData.request.url);
      if (
        reqData.request.method in SkipReqForMethods
        || url.host in SkipReqForHost
        || url.protocol in SkipReqForProtocol
      ) {
        // TODO
        // skip requests
      }

      if (reqData.redirectHasExtraInfo) {
        // TODO
        log('TODO data.redirectHasExtraInfo is true');
      }

      persistance.setReqMeta(reqData.requestId, {
        origin: reqData.documentURL,
        method: reqData.request.method,
        url: reqData.request.url,
        id: reqData.requestId,
        reqHeaders: reqData.request.headers,
        // TODO post data
      });
    } else if (event === ENetworkEvents.RespReceivedExtraInfo) {
      // only during redirect save the header to the original request
      if ((dataObj || ({} as any)).statusCode === 302) {
        console.log('TODO RespReceivedExtraInfo with redirect status 302');
      }
    } else if (event === ENetworkEvents.ResponseReceived) {
      const respData = dataObj as NNetworkEvents.IRespReceivedData;
      persistance.setReqMeta(respData.requestId, {
        content_type:
          respData.response.mimeType
          || respData.response.headers['content-type']
          || respData.response.headers['Content-Type'],
        respHeaders: respData.response.headers,
      });
    } else if (event === ENetworkEvents.LoadingFinished) {
      const finishedData = dataObj as NNetworkEvents.IBaseXhrNetData;
      const savedReq = await persistance.getReqMeta(finishedData.requestId);
      try {
        const resp = await getRespBody(tab.tabId, finishedData.requestId);
        console.log('===========================================');
        console.log(resp);
        console.log('===========================================');
      } catch (e) {
        console.log('Error while fetching response', e, savedReq);
      }
    }
  };
}

async function startRecordingPage(port: chrome.runtime.Port, tab: chrome.tabs.Tab) {
  await chrome.debugger.attach({ tabId: tab.id }, '1.0');
  await chrome.debugger.sendCommand({ tabId: tab.id }, 'Network.enable');
  chrome.debugger.onEvent.addListener(onNetworkEvts());
  await chrome.tabs.reload(tab.id as number);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'fable_ext_popup') {
    port.onMessage.addListener(async (msg: IRuntimeMsg) => {
      let activeTab: chrome.tabs.Tab;
      switch (msg.type) {
        case 'record':
          port.postMessage({ status: 'started' });

          activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
          if (!activeTab) {
            throw new Error('Active tab should not be null');
          }
          await persistance.setRecordedTab(activeTab.id as number);

          await startRecordingPage(port, activeTab);
          break;

        default:
          break;
      }
    });
  }
});

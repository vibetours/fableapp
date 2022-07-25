export function log(...msg: Array<String>) {
  console.log(...msg);
}

enum ENetworkEvents {
  RequestWillbeSent = 'Network.requestWillBeSent',
  RespReceivedExtraInfo = 'Network.responseReceivedExtraInfo',
  ResponseReceived = 'Network.responseReceived',
  LoadingFinished = 'Network.loadingFinished',
}

enum StorageKeys {
  RecordedTabs = 'tabs_being_recorded',
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

async function addTabIdToRecordList(id: number) {
  const list = await chrome.storage.session.get(StorageKeys.RecordedTabs);
  let recTabs: Array<number>;
  if (StorageKeys.RecordedTabs in list && (recTabs = list[StorageKeys.RecordedTabs]) instanceof Array) {
    recTabs.push(id);
  } else {
    recTabs = [id];
  }
  await chrome.storage.session.set({ [StorageKeys.RecordedTabs]: recTabs });
}

async function getRecordedTabs(): Promise<Record<number, number>> {
  const list = await chrome.storage.session.get(StorageKeys.RecordedTabs);
  const tabs = list[StorageKeys.RecordedTabs] as Array<number> | undefined;
  if (!tabs) {
    return {};
  }

  return tabs.reduce((store: Record<number, number>, v: number) => ((store[v] = 1), store), {});
}

namespace NNetworkEvents {
  export interface IBaseXhrNetData {
    requestId: string;
  }

  export interface IReqWillBeSentData extends IBaseXhrNetData {
    request: {
      headers: Record<string, string | number>;
      url: string;
      method: 'GET' | 'POST';
    };
    documentURL: string;
    redirectHasExtraInfo?: boolean;
  }

  export interface IRespReceivedData extends IBaseXhrNetData {
    response: {
      headers: Record<string, string | number>;
      mimeType: string;
    };
  }
}

// TODO take tab id as param and save it as a key
async function saveRequests(reqId: string, data: Record<string, any>) {
  const key = `REQ_${reqId}`;
  const storedData = await chrome.storage.session.get(key);
  if (storedData[key]) {
    await chrome.storage.session.set({ [key]: { ...storedData, ...data } });
  } else {
    await chrome.storage.session.set({ [key]: data });
  }
}

async function getReq(reqId: string): Promise<Record<string, any> | null> {
  const key = `REQ_${reqId}`;
  const storedData = await chrome.storage.session.get(key);
  return storedData[key] || null;
}

async function getRespBody(tabId: number, reqId: string) {
  return chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', {
    requestId: reqId,
  });
}

function onNetworkEvts() {
  return async function (tab: chrome.debugger.Debuggee, eventStr: String, dataObj: Object | undefined) {
    console.log(tab, eventStr, dataObj);
    // If the request is coming from tab which is not being recorded then skip the details
    const recordedTabs = await getRecordedTabs();
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
        console.log('TODO data.redirectHasExtraInfo is true');
      }

      saveRequests(reqData.requestId, {
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
      saveRequests(respData.requestId, {
        content_type:
          respData.response.mimeType
          || respData.response.headers['content-type']
          || respData.response.headers['Content-Type'],
        respHeaders: respData.response.headers,
      });
    } else if (event === ENetworkEvents.LoadingFinished) {
      const finishedData = dataObj as NNetworkEvents.IBaseXhrNetData;
      const savedReq = await getReq(finishedData.requestId);
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

function startRecordingPage(port: chrome.runtime.Port, tab: chrome.tabs.Tab) {
  chrome.debugger.attach({ tabId: tab.id }, '1.0');
  chrome.debugger.sendCommand({ tabId: tab.id }, 'Network.enable');
  chrome.debugger.onEvent.addListener(onNetworkEvts());
  chrome.tabs.reload(tab.id as number);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup-1') {
    port.onMessage.addListener(async (msg) => {
      let activeTab: chrome.tabs.Tab;
      switch (msg.type) {
        case 'record':
          port.postMessage({ status: 'started' });
          activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
          if (!activeTab) {
            throw new Error('Active tab should not be null');
          }

          await addTabIdToRecordList(activeTab.id as number);
          startRecordingPage(port, activeTab);
          break;

        default:
          break;
      }
    });
  } else {
    log('port is something else');
  }
});

log('hello world');

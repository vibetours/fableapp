import {
  RecordingStatus,
  StorageKeys,
  SerializableReq,
  SerializableRedirectResp,
  SerializableResp,
  SerializablePayload,
} from './types';
import ReqProcessingSynchronizer from './req_processing_sync';
import { getRandomId } from './utils';

// Persistence of data using chrome.storage.session
export const setRecordingStatus = async (value: RecordingStatus) => {
  await chrome.storage.session.set({ [StorageKeys.RecordingStatus]: value });
};

export const getRecordingStatus = async (): Promise<RecordingStatus> => {
  const value = await chrome.storage.session.get(StorageKeys.RecordingStatus);
  return value[StorageKeys.RecordingStatus] || RecordingStatus.Idle;
};

export const setLastActiveTab = async (id: number) => {
  await chrome.storage.session.set({ [StorageKeys.LastActiveTabId]: id });
};

export const getLastActiveTab = async (): Promise<number | null> => {
  const data = await chrome.storage.session.get(StorageKeys.LastActiveTabId);
  if (StorageKeys.LastActiveTabId in data) {
    return data[StorageKeys.LastActiveTabId];
  }
  return null;
};

export const getTabsBeingRecorded = async (): Promise<Record<number, number>> => {
  const list = await chrome.storage.session.get(StorageKeys.RecordedTabs);
  const tabs = list[StorageKeys.RecordedTabs] as Array<number> | undefined;
  if (!tabs) {
    return {};
  }
  return tabs.reduce((store: Record<number, number>, v: number) => ((store[v] = 1), store), {});
};

export const clearTabsBeingRecorded = async () => {
  await chrome.storage.session.remove(StorageKeys.RecordedTabs);
};

export const addToTabsBeingRecordedList = async (id: number) => {
  const tabsBeingRecorded = await getTabsBeingRecorded();
  const tabIds = Object.keys(tabsBeingRecorded).map((key) => +key);
  tabIds.push(id);
  await chrome.storage.session.set({ [StorageKeys.RecordedTabs]: tabIds });
};

// WARN If a debugger is attached to 2 tabs and either of the tabs gets closed then
// debugger gets detached from the other tab.
export const removeFromTabsBeingRecordedList = async (id: number) => {
  const tabsBeingRecorded = await getTabsBeingRecorded();
  delete tabsBeingRecorded[id];
  const tabIds = Object.keys(tabsBeingRecorded).map((key) => +key);
  await chrome.storage.session.set({ [StorageKeys.RecordedTabs]: tabIds });
};

export const setReqData = async (
  tabId: number,
  reqId: string,
  data: SerializableReq | SerializableRedirectResp | SerializableResp
) => {
  const key = `${StorageKeys.PrefixRequestData}_${tabId}_${reqId}`;
  const storedData = await chrome.storage.session.get(key);
  if (storedData[key]) {
    await chrome.storage.session.set({ [key]: { ...storedData[key], ...data } });
  } else {
    await chrome.storage.session.set({ [key]: data });
  }
};

export const getReqMeta = async (tabId: number, reqId: string): Promise<SerializablePayload | null> => {
  const key = `${StorageKeys.PrefixRequestData}_${tabId}_${reqId}`;
  const storedData = await chrome.storage.session.get(key);
  return storedData[key] || null;
};

export const getAllowedHost = async (): Promise<Record<string, number>> => {
  const data = await chrome.storage.session.get(StorageKeys.AllowedHost);
  let allowedHosts = data[StorageKeys.AllowedHost];
  if (!allowedHosts) {
    allowedHosts = {};
  }
  return allowedHosts;
};

export const setAllowedHost = async (tab: chrome.tabs.Tab) => {
  const allowedHosts = await getAllowedHost();
  const url = new URL(tab.url || '');
  allowedHosts[url.host] = 1;
  await chrome.storage.session.set({ [StorageKeys.AllowedHost]: allowedHosts });
};

export const addToUploadQ = async (sync: ReqProcessingSynchronizer, payload: SerializablePayload) => {
  const id = getRandomId();
  sync.addReqIdToBeUploaded(id);
  await chrome.storage.local.set({ [id]: payload });
};

export const getFromUploadQ = async (
  sync: ReqProcessingSynchronizer,
  limit?: number
): Promise<[Record<string, SerializablePayload>, boolean]> => {
  const data = await chrome.storage.local.get(StorageKeys.UploadIds);
  let uploadIds: Array<string> = sync.reqIdsToBeUploaded;
  const totalUploadRemaining = uploadIds.length;
  if (uploadIds.length) {
    if (limit) {
      uploadIds = uploadIds.slice(0, limit);
    }
    const dataToBeUploaded = await chrome.storage.local.get(uploadIds);
    return [dataToBeUploaded, totalUploadRemaining > uploadIds.length];
  }
  return [{}, false];
};

export const removeFromQ = async (sync: ReqProcessingSynchronizer, ids: Array<string>) => {
  const uploadIds = sync.reqIdsToBeUploaded;
  if (uploadIds.length) {
    const uploadIdsMap = uploadIds.reduce((store: Record<string, number>, id: string) => {
      store[id] = 1;
      return store;
    }, {});

    const idMap = ids.reduce((store: Record<string, number>, id: string) => {
      store[id] = 1;
      return store;
    }, {});

    for (const key in idMap) {
      if (Object.prototype.hasOwnProperty.call(idMap, key)) {
        delete uploadIdsMap[key];
      }
    }
    sync.resetUploadIdsTo(Object.keys(uploadIdsMap));
  }
  await chrome.storage.local.remove(ids);
};

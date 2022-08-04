import { RecordingStatus, StorageKeys } from './types';

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

export const addToTabsBeingRecordedList = async (id: number) => {
  const tabsBeingRecorded = await getTabsBeingRecorded();
  const tabIds = Object.keys(tabsBeingRecorded).map((key) => +key);
  tabIds.push(id);
  await chrome.storage.session.set({ [StorageKeys.RecordedTabs]: tabIds });
};

export const removeFromTabsBeingRecordedList = async (id: number) => {
  const tabsBeingRecorded = await getTabsBeingRecorded();
  delete tabsBeingRecorded[id];
  const tabIds = Object.keys(tabsBeingRecorded).map((key) => +key);
  await chrome.storage.session.set({ [StorageKeys.RecordedTabs]: tabIds });
};

// TODO take tab id as param and save it as a key
// TODO exact type of data, not any
export const setReqMeta = async (reqId: string, data: Record<string, any>) => {
  const key = `${StorageKeys.PrefixRequestMeta}_${reqId}`;
  const storedData = await chrome.storage.session.get(key);
  if (storedData[key]) {
    await chrome.storage.session.set({ [key]: { ...storedData, ...data } });
  } else {
    await chrome.storage.session.set({ [key]: data });
  }
};

// TODO exact type of data, not any
export const getReqMeta = async (reqId: string): Promise<Record<string, any> | null> => {
  const key = `${StorageKeys.PrefixRequestMeta}_${reqId}`;
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

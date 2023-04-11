import { DBData } from './types';

export function openDb(dbName: string, storeName: string, version: number, keyPath: string):Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = window.indexedDB.open(dbName, version);

    openRequest.onupgradeneeded = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath });
      }
    };

    openRequest.onsuccess = function (event) {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    openRequest.onerror = function (event) {
      reject(new Error('Error opening database'));
    };
  });
}

export function getDataFromDb(db: IDBDatabase, storeName: string, key: string) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const objectStore = transaction.objectStore(storeName);

    const getRequest = objectStore.get(key);

    getRequest.onsuccess = function (event) {
      resolve(getRequest.result);
    };

    getRequest.onerror = function (event) {
      reject(new Error('Error getting data from object store'));
    };
  });
}

export function putDataInDb(db: IDBDatabase, storeName: string, data: DBData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    const putRequest = objectStore.put(data);

    putRequest.onsuccess = function (event) {
      resolve(data);
    };

    putRequest.onerror = function (event) {
      reject(new Error('Error putting data in object store'));
    };
  });
}

export function deleteDataFromDb(db: IDBDatabase, storeName: string, key: string) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    const deleteRequest = objectStore.delete(key);

    deleteRequest.onsuccess = function (event) {
      resolve(key);
    };

    deleteRequest.onerror = function (event) {
      reject(new Error('Error deleting data from object store'));
    };
  });
}

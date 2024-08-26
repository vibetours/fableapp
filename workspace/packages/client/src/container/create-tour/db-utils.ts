import { ApiResp, PvtAssetType, RespUploadUrl } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
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

    Promise.all([
      new Promise(res => {
        transaction.addEventListener('complete', () => {
          res(data);
        });
      }),
      new Promise(res => {
        putRequest.onsuccess = function (event) {
          res(data);
        };
      })
    ]).then(([d]) => {
      resolve(d);
    });

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

    Promise.all([
      new Promise(res => {
        transaction.addEventListener('complete', () => {
          res(key);
        });
      }),
      new Promise(res => {
        deleteRequest.onsuccess = function (event) {
          res(key);
        };
      })
    ]).then(([d]) => {
      resolve(d);
    });

    deleteRequest.onerror = function (event) {
      reject(new Error('Error deleting data from object store'));
    };
  });
}

export const saveDbDataToAws = async (dbData: DBData, anonDemoId: string): Promise<void> => {
  try {
    const nameOfSerdomFile = 'index.json';
    const contentType = 'application/json';
    const data = await api<null, ApiResp<RespUploadUrl>>(`/getpvtuploadlink?te=${btoa(contentType)}&pre=${anonDemoId}&fe=${btoa(nameOfSerdomFile)}&t=${PvtAssetType.TourInputData}`, {
      auth: true
    });
    const s3PresignedUploadUrl = data.data.url;

    const res = await fetch(s3PresignedUploadUrl, {
      method: 'PUT',
      body: JSON.stringify(dbData),
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    if (err instanceof Error) {
      raiseDeferredError(err);
    }
  }
};

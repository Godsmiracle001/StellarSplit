import { openDB } from 'idb';

export const dbPromise = openDB('stellar-split-db', 1, {
  upgrade(db) {
    db.createObjectStore('splits', { keyPath: 'id' });
    db.createObjectStore('queuedPayments', { keyPath: 'id' });
  }
});

export const saveSplitOffline = async (split: any) => {
  const db = await dbPromise;
  await db.put('splits', split);
};

export const getOfflineSplits = async () => {
  const db = await dbPromise;
  return db.getAll('splits');
};
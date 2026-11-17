const DB_NAME = 'deadline-vault-files';
const STORE_NAME = 'files';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('Durable file storage is unavailable in this browser.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open durable file storage.'));
  });
}

export async function saveVaultFile(id: string, blob: Blob, filename: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, blob, filename, type: blob.type, size: blob.size });
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(new Error('Could not save the file to the Vault. Check available browser storage.'));
  });
  db.close();
}

export async function getVaultFile(id: string): Promise<{ blob: Blob; filename: string } | null> {
  const db = await openDatabase();
  const record = await new Promise<{ blob: Blob; filename: string } | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not retrieve the Vault file.'));
  });
  db.close();
  return record || null;
}

export async function deleteVaultFile(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(new Error('Could not remove the stored Vault file.'));
  });
  db.close();
}

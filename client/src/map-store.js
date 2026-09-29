const DB_NAME = "mmfinder";
const STORE = "maps";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Could not open local map storage."));
  });
}

function finish(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not save the map on this device."));
    tx.onabort = () => reject(tx.error || new Error("Could not save the map on this device."));
  });
}

export async function saveMap(zoneId, file) {
  const db = await openDb();
  const record = {
    zoneId,
    blob: file,
    filename: file.name || zoneId,
    type: file.type,
    updatedAt: new Date().toISOString(),
  };
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(record, zoneId);
  await finish(tx);
  db.close();
  return record;
}

export async function listMaps() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error || new Error("Could not read local maps."));
  });
  db.close();
  return rows;
}

const DB_NAME = "AniShadowDB";
const STORE_NAME = "volumes";
const DB_VERSION = 1;

export interface StoredVolume {
  key: string;
  novelId: string;
  volumeNum: number;
  fileName: string;
  fileType: string;
  fileBlob: Blob;
  uploadedAt: string;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

export async function saveVolume(
  novelId: string,
  volumeNum: number,
  file: File
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const key = `${novelId}-vol-${volumeNum}`;
    const record: StoredVolume = {
      key,
      novelId,
      volumeNum,
      fileName: file.name,
      fileType: file.type || (file.name.endsWith(".epub") ? "application/epub+zip" : "application/pdf"),
      fileBlob: file,
      uploadedAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to save volume"));
  });
}

export async function getVolume(
  novelId: string,
  volumeNum: number
): Promise<StoredVolume | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const key = `${novelId}-vol-${volumeNum}`;
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Failed to retrieve volume"));
  });
}

export async function deleteVolume(
  novelId: string,
  volumeNum: number
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const key = `${novelId}-vol-${volumeNum}`;
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to delete volume"));
  });
}

export async function getUploadedVolumesForNovel(
  novelId: string
): Promise<Record<number, { fileName: string; uploadedAt: string }>> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const filtered = results.filter((r: StoredVolume) => r.novelId === novelId);
        const map: Record<number, { fileName: string; uploadedAt: string }> = {};
        for (const item of filtered) {
          map[item.volumeNum] = {
            fileName: item.fileName,
            uploadedAt: item.uploadedAt
          };
        }
        resolve(map);
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to list uploaded volumes"));
      };
    });
  } catch (e) {
    console.error("IndexedDB getUploadedVolumesForNovel failed:", e);
    return {};
  }
}

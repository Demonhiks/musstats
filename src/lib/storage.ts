import type { Dataset, Play, PlayRow } from '../types';

const DB_NAME = 'musstats';
const DB_VERSION = 1;
const STORE = 'kv';
const KEY = 'dataset';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB недоступен'));
  });
  return dbPromise;
}

async function readRaw(): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    try {
      return localStorage.getItem(`${DB_NAME}:${KEY}`);
    } catch {
      return null;
    }
  }
}

async function writeRaw(value: string | null): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (value == null) store.delete(KEY);
      else store.put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      if (value == null) localStorage.removeItem(`${DB_NAME}:${KEY}`);
      else localStorage.setItem(`${DB_NAME}:${KEY}`, value);
    } catch {
      throw new Error('Не удалось сохранить данные: хранилище браузера переполнено');
    }
  }
}

/** В хранилище лежим компактно: массив кортежей вместо объектов. */
export async function loadDataset(): Promise<Dataset | null> {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Dataset & { rows?: PlayRow[] };
    if (Array.isArray(parsed.plays)) return parsed;
    if (Array.isArray(parsed.rows)) {
      const plays: Play[] = parsed.rows.map(([title, artist, album, ts]) => ({
        title,
        artist,
        album: album || undefined,
        ts,
      }));
      return { version: 1, updatedAt: parsed.updatedAt ?? Date.now(), source: parsed.source ?? '', plays };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveDataset(dataset: Dataset | null): Promise<void> {
  if (dataset == null) {
    await writeRaw(null);
    return;
  }

  // Просим браузер не выселять хранилище: на iOS это снижает шанс потерять историю.
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* не критично, если браузер отказал */
  }
  const rows: PlayRow[] = dataset.plays.map((play) => [
    play.title,
    play.artist,
    play.album ?? '',
    play.ts,
  ]);
  const payload = JSON.stringify({ ...dataset, plays: undefined, rows });
  await writeRaw(payload);
}

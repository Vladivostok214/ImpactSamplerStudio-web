// IndexedDB Storage para persistencia local de SoundFonts en el navegador

export interface StoredSoundFontEntry {
  id: string; // ej: 'Yamaha_RX7_Drums.sf2'
  filename: string;
  displayName: string;
  description: string;
  category: string;
  fileSizeMb: number;
  data: ArrayBuffer;
  savedAt: number;
}

const DB_NAME = 'ImpactSamplerStudioDB';
const DB_VERSION = 2;
const STORE_NAME = 'soundfonts';
const META_STORE_NAME = 'soundfonts_meta';
const LAST_SF_KEY = 'impact_last_loaded_soundfont';

export type StoredSoundFontMeta = Omit<StoredSoundFontEntry, 'data'>;

export class SoundFontStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(META_STORE_NAME)) {
            db.createObjectStore(META_STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  public static async save(entry: StoredSoundFontEntry): Promise<void> {
    const db = await this.getDB();
    const { data: _, ...meta } = entry;
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.objectStore(META_STORE_NAME).put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public static async get(id: string): Promise<StoredSoundFontEntry | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public static async list(): Promise<StoredSoundFontMeta[]> {
    const db = await this.getDB();

    // 1. Leer únicamente el almacén ligero de metadatos (pocos bytes en lugar de cientos de MB)
    const metaList = await new Promise<StoredSoundFontMeta[]>((resolve, reject) => {
      const tx = db.transaction(META_STORE_NAME, 'readonly');
      const store = tx.objectStore(META_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredSoundFontMeta[]) || []);
      req.onerror = () => reject(req.error);
    });

    // 2. Verificar si existen claves antiguas en STORE_NAME sin migrar a META_STORE_NAME (migración 1 a 1 sin pico de RAM)
    const allBlobKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const knownIds = new Set(metaList.map((m) => m.id));
    const missingKeys = allBlobKeys.map(String).filter((k) => !knownIds.has(k));

    if (missingKeys.length > 0) {
      for (const key of missingKeys) {
        const entry = await this.get(key);
        if (entry) {
          const { data: _, ...meta } = entry;
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(META_STORE_NAME, 'readwrite');
            tx.objectStore(META_STORE_NAME).put(meta);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          metaList.push(meta);
        }
      }
    }

    return metaList;
  }

  public static async delete(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.objectStore(META_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public static getLastLoadedId(): string | null {
    try {
      return localStorage.getItem(LAST_SF_KEY);
    } catch {
      return null;
    }
  }

  public static setLastLoadedId(id: string): void {
    try {
      localStorage.setItem(LAST_SF_KEY, id);
    } catch {
      // Ignorar quota errors
    }
  }
}

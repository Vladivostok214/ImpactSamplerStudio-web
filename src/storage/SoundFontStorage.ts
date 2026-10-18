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
const DB_VERSION = 1;
const STORE_NAME = 'soundfonts';
const LAST_SF_KEY = 'impact_last_loaded_soundfont';

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
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  public static async save(entry: StoredSoundFontEntry): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
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

  public static async list(): Promise<Omit<StoredSoundFontEntry, 'data'>[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as StoredSoundFontEntry[]).map(({ data: _, ...meta }) => meta);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public static async delete(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
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

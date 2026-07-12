// Thin storage abstraction. UI never touches localStorage directly.
// Swap this out later for Firebase / Supabase / Appwrite without touching hooks.

export interface KVStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  subscribe(listener: () => void): () => void;
}

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

const memory = new Map<string, string>();
const hasWindow = typeof window !== "undefined";

export const storage: KVStore = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = hasWindow ? window.localStorage.getItem(key) : memory.get(key) ?? null;
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    const raw = JSON.stringify(value);
    if (hasWindow) window.localStorage.setItem(key, raw);
    else memory.set(key, raw);
    notify();
  },
  remove(key: string): void {
    if (hasWindow) window.localStorage.removeItem(key);
    else memory.delete(key);
    notify();
  },
  subscribe(listener) {
    listeners.add(listener);
    if (hasWindow) {
      const onStorage = (e: StorageEvent) => {
        if (e.storageArea === window.localStorage) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    }
    return () => listeners.delete(listener);
  },
};

export const KEYS = {
  profile: "byteprep:profile",
  missions: "byteprep:missions",
  sessions: "byteprep:sessions",
  chapterMeta: "byteprep:chapterMeta", // Record<chapterKey, ChapterMeta>
  settings: "byteprep:settings",
} as const;

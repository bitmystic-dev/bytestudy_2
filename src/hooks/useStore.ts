import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
const storage = {
  subscribe: (listener: () => void) => () => { void listener; },
  get: <T,>(_key: string, fallback: T) => fallback,
  set: <T,>(_key: string, _value: T) => undefined,
  remove: (_key: string) => undefined,
};

// Cache parsed snapshots per key so useSyncExternalStore gets a stable reference
// between reads when the underlying JSON string hasn't changed.
export function useStore<T>(key: string, fallback: T) {
  const cacheRef = useRef<{ raw: string | null; value: T } | null>(null);

  const subscribe = useCallback((cb: () => void) => storage.subscribe(cb), []);

  const getSnapshot = useCallback((): T => {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    const cache = cacheRef.current;
    if (cache && cache.raw === raw) return cache.value;
    let value: T;
    if (raw == null) {
      value = fallback;
    } else {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    cacheRef.current = { raw, value };
    return value;
  }, [key, fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const prev = storage.get<T>(key, fallback);
      const next =
        typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      storage.set(key, next);
    },
    [key, fallback],
  );

  const remove = useCallback(() => storage.remove(key), [key]);

  return useMemo(() => [value, set, remove] as const, [value, set, remove]);
}

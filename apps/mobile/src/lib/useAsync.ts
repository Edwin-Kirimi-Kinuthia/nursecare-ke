import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@carebora/shared";

/** Message safe to show a person for any thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return "Can't reach Care Bora. Check your internet connection.";
  return fallback;
}

/**
 * Load something and keep it fresh: { data, error, loading, refreshing, reload }.
 * `reload` keeps the old data on screen while it fetches (so pull-to-refresh
 * doesn't flash empty), and a stale response can't overwrite a newer one.
 *
 * `deps` decides when to load again, exactly like an effect's list — but it is
 * compared as a serialised key, so callers can pass an ordinary array and the
 * fetcher is always the latest closure without being a dependency itself.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const key = JSON.stringify(deps);

  const run = useCallback(async (isRefresh: boolean) => {
    const mine = ++seq.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const result = await fnRef.current();
      if (mine === seq.current) { setData(result); setError(null); }
    } catch (err) {
      if (mine === seq.current) setError(errorMessage(err));
    } finally {
      if (mine === seq.current) { setLoading(false); setRefreshing(false); }
    }
    // `key` stands in for the caller's dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Deferred to a microtask so the state writes land after the effect rather
  // than synchronously inside it, which would cascade a second render.
  useEffect(() => { queueMicrotask(() => { void run(false); }); }, [run]);
  const reload = useCallback(() => run(true), [run]);
  return { data, error, loading, refreshing, reload, setData };
}

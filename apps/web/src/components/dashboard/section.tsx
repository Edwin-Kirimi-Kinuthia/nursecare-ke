"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

/** Fetches a section's data on mount; exposes loading / error / data + reload.
 *  Each section is independent, so one failing endpoint never blanks the others. */
export function useSection<T>(fetcher: () => Promise<T>, preserveOnRefresh = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);
  const current = useRef<T | null>(null);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(!preserveOnRefresh || current.current === null);
    setError(null);
    try {
      const result = await fetcher();
      if (request === sequence.current) { current.current = result; setData(result); }
    } catch (e) {
      if (request === sequence.current) setError(e instanceof Error ? e.message : "Failed to load");
    } finally { if (request === sequence.current) setLoading(false); }
  }, [fetcher, preserveOnRefresh]);
  useEffect(() => {
    let active = true;
    current.current = null;
    queueMicrotask(() => { if (active) { setData(null); void reload(); } });
    const requests = sequence;
    return () => { active = false; requests.current++; };
  }, [reload]);
  return { data, loading, error, reload };
}

/** Uniform loading / error / empty shell so every dashboard section behaves the same. */
export function SectionShell({
  loading, error, onRetry, empty, emptyText, children,
}: {
  loading: boolean; error: string | null; onRetry: () => void;
  empty?: boolean; emptyText?: string; children: React.ReactNode;
}) {
  if (loading) return <div className="grid h-52 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-300"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) {
    return (
      <div className="grid h-52 place-items-center rounded-2xl border border-rose-200 bg-rose-50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-500" />
          <p className="mt-2 text-sm font-medium text-rose-700">{error}</p>
          <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }
  if (empty) return <div className="grid h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white"><p className="text-sm text-slate-400">{emptyText ?? "Nothing here yet."}</p></div>;
  return <>{children}</>;
}

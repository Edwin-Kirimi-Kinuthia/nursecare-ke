"use client";
import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

export function useDashboardTab<T extends string>(allowed: readonly T[], initial: T) {
  const params = useSearchParams();
  const value = params.get("tab");
  const tab = allowed.includes(value as T) ? value as T : initial;
  const select = useCallback((selected: T) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", selected);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  return [tab, select] as const;
}

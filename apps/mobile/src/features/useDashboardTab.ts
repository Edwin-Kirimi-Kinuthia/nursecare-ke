import { useLocalSearchParams, router } from "expo-router";
import { useCallback } from "react";
export function useDashboardTab<T extends string>(allowed: readonly T[], initial: T) {
  const params = useLocalSearchParams<{tab?:string}>();
  const tab = allowed.includes(params.tab as T) ? params.tab as T : initial;
  const setTab = useCallback((value:T)=>router.setParams({tab:value}),[]);
  return [tab,setTab] as const;
}

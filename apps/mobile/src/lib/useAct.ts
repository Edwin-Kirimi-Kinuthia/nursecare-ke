import { useState } from "react";
import { errorMessage } from "./useAsync";

/** Run one-at-a-time actions (buttons in a list): which one is busy, and the last error. */
export function useAct() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function run(key: string, fn: () => Promise<unknown>, after?: () => void) {
    setBusy(key); setErr(null);
    try { await fn(); after?.(); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(null); }
  }
  return { busy, err, run, setErr };
}

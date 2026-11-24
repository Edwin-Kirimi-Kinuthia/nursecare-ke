"use client";

import { useState, type ReactNode } from "react";

/** Display an actionable error for an unready document instead of downloading JSON. */
export default function ClinicalPdfLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function download() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      let response = await fetch(href, { credentials: "include", cache: "no-store" });
      if (response.status === 401) {
        const refreshed = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (refreshed.ok) response = await fetch(href, { credentials: "include", cache: "no-store" });
      }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message ?? "This document is not ready to download.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "carebora-document.pdf";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not download this document."); }
    finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col gap-1">
    <button type="button" onClick={download} disabled={busy} aria-busy={busy} className={`cursor-pointer underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait ${className ?? "text-teal-700 font-semibold"}`}>{busy ? "Preparing PDF…" : children}</button>
    {error && <span role="alert" className="max-w-xs text-xs text-rose-700">{error}</span>}
  </span>;
}

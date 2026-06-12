"use client";

import { useEffect, useState } from "react";

type Health = { status: string; db: "up" | "down"; version: string; time: string };

/**
 * Tiny live indicator that calls GET /api/v1/health — proves the API + DB
 * wiring works end-to-end from the browser. Shown on the landing during M0.
 */
export default function HealthBadge() {
  const [state, setState] = useState<"loading" | Health | "error">("loading");

  useEffect(() => {
    fetch("/api/v1/health")
      .then((r) => r.json())
      .then((body) => setState(body.data ?? "error"))
      .catch(() => setState("error"));
  }, []);

  const apiUp = state !== "loading" && state !== "error";
  const dbUp = apiUp && (state as Health).db === "up";

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
      <span className="flex items-center gap-1.5">
        <Dot ok={apiUp} loading={state === "loading"} />
        API {apiUp ? "v1 online" : state === "loading" ? "checking…" : "offline"}
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="flex items-center gap-1.5">
        <Dot ok={dbUp} loading={state === "loading"} />
        Database {dbUp ? "connected" : state === "loading" ? "checking…" : "not configured"}
      </span>
    </div>
  );
}

function Dot({ ok, loading }: { ok: boolean; loading: boolean }) {
  const color = loading ? "bg-slate-300" : ok ? "bg-teal-500" : "bg-amber-400";
  return <span className={`h-2 w-2 rounded-full ${color} ${ok ? "animate-pulse" : ""}`} />;
}

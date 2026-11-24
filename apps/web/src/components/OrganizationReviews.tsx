"use client";
import { useState } from "react";
import { api } from "@/lib/api";
export default function OrganizationReviews({ orgId, name }: { orgId: string; name: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.listOrganizationReviews>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true); setError("");
    try { setData(await api.listOrganizationReviews(orgId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load reviews"); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 text-sm">
    {!data && <button onClick={load} disabled={busy} className="font-medium text-teal-800 underline">{busy ? "Loading reviews…" : `Reviews of ${name}`}</button>}
    {error && <p role="alert">{error}</p>}
    {data && <div className="space-y-2"><p className="font-semibold">{data.ratingCount ? `★ ${data.ratingAvg.toFixed(1)} · ${data.ratingCount} verified reviews` : "No reviews yet"}</p>{data.reviews.map(r => <div key={r.id} className="rounded-lg bg-slate-50 p-3"><p>{r.rating}/5 stars · Verified service</p>{r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}</div>)}</div>}
  </div>;
}

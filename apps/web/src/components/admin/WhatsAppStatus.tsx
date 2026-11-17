"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, type WhatsAppAdminStatus } from "@carebora/shared";
import { api } from "@/lib/api";

export default function WhatsAppStatus() {
  const [data, setData] = useState<WhatsAppAdminStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setData(await api.adminWhatsAppStatus()); setError(""); }
    catch { setError("Couldn't load WhatsApp delivery status."); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    api.adminWhatsAppStatus().then((response) => { if (!cancelled) setData(response); })
      .catch(() => { if (!cancelled) setError("Couldn't load WhatsApp delivery status."); });
    return () => { cancelled = true; };
  }, []);
  async function retry() {
    setBusy(true); setError("");
    try { await api.adminRetryWhatsApp(); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Couldn't retry messages."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900">WhatsApp delivery</h2>
      <button onClick={() => void load()} className="text-sm font-semibold text-teal-700">Refresh status</button>
    </div>
    <p className="mt-2 text-sm text-slate-600">Admin alerts cover new clients, bookings and website enquiries. Clients who opt in receive their own service updates.</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    {!data && !error && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
    {data && <>
      <div className={`mt-4 rounded-xl p-4 text-sm ${data.ready ? "bg-teal-50 text-teal-900" : "bg-amber-50 text-amber-900"}`}>
        <p className="font-semibold">{data.ready ? "WhatsApp Business connection configured" : "WhatsApp delivery is not active"}</p>
        {!data.enabled && <p className="mt-1">Sending is switched off until the Business API account and approved templates are ready.</p>}
        {!!data.missing.length && <p className="mt-1">Missing server settings: {data.missing.join(", ")}</p>}
        <p className="mt-1">Admin recipients: {data.adminNumbers.join(", ") || "None configured"}</p>
        {!!data.invalidAdminNumbers && <p className="mt-1">Correct the invalid recipient numbers in server settings.</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
        {Object.entries(data.counts).map(([status, count]) => <span key={status} className="rounded-lg bg-slate-100 px-3 py-2">{status}: <strong>{count}</strong></span>)}
      </div>
      <p className="mt-4 text-xs text-slate-500">Accepted means Meta received the request. Delivered and read are confirmed by signed delivery receipts. Unknown sends are held to avoid duplicate alerts. Meeting alerts expire after 15 minutes.</p>
      <button onClick={retry} disabled={busy || !data.ready} className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Retrying…" : "Retry eligible alerts"}</button>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Event</th><th className="p-2">Recipient</th><th className="p-2">Status</th><th className="p-2">Error</th><th className="p-2">Created</th></tr></thead>
          <tbody>{data.recent.map((m) => <tr key={m.id} className="border-b border-slate-100"><td className="p-2">{m.templateKey.replaceAll("_", " ")}</td><td className="p-2">{m.toPhone}</td><td className="p-2">{m.status}</td><td className="p-2">{m.errorCode || "—"}</td><td className="p-2">{new Date(m.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}</td></tr>)}</tbody>
        </table>
        {!data.recent.length && <p className="mt-4 text-sm text-slate-500">No WhatsApp alerts have been queued yet.</p>}
      </div>
    </>}
  </section>;
}

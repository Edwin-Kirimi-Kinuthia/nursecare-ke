"use client";
import { useCallback, useState } from "react";
import { api, kes, when } from "@/lib/api";
import { useSection, SectionShell } from "@/components/dashboard/section";
import { useAuth } from "@/components/AuthProvider";
import type { Withdrawal } from "@carebora/api-client";
export default function AdminWithdrawals() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (user?.role !== "admin") return <p className="p-8">Administrator access required.</p>;
  return <Queue />;
}
function Queue() {
  const fetcher = useCallback(() => api.adminWithdrawals(), []);
  const { data, loading, error, reload } = useSection(fetcher);
  return <div className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-3xl font-semibold">M-Pesa withdrawals</h1><p className="my-4 text-slate-600">B2C requests are sent automatically and confirmed by M-Pesa. Reconcile uncertain transfers against your statement. For manual requests, claim the request before sending funds, then record the confirmed receipt.</p><SectionShell loading={loading} error={error} onRetry={reload} empty={data?.length === 0} emptyText="No pending withdrawals."><div className="space-y-4">{data?.map(w => <Request key={`${w.id}-${w.status}`} withdrawal={w} reload={reload} />)}</div></SectionShell></div>;
}
function Request({ withdrawal: w, reload }: { withdrawal: Withdrawal; reload: () => Promise<void> }) {
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function process(status: "processing" | "paid" | "failed") {
    if (busy) return; setBusy(true); setError("");
    try { await api.processWithdrawal(w.id, { status, ...(status === "paid" ? { reference: receipt } : {}) }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to update"); }
    finally { setBusy(false); }
  }
  async function send() {
    if (busy) return; setBusy(true); setError("");
    try { await api.sendWithdrawal(w.id); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not submit"); }
    finally { setBusy(false); }
  }
  async function reconcile(outcome: "paid" | "failed") {
    if (busy) return; setBusy(true); setError("");
    try { await api.reconcileWithdrawal(w.id, { outcome, note, ...(outcome === "paid" ? { reference: receipt } : {}) }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reconcile"); }
    finally { setBusy(false); }
  }
  if (w.gateway === "mpesa_b2c") return <article className="space-y-3 rounded-2xl border border-teal-200 bg-white p-5">
    <h2 className="font-semibold">{kes(w.amountKes)} → {w.phoneNumber} · B2C · {w.status}</h2>
    <p className="break-all text-xs text-slate-500">Request {w.id} · {when(w.createdAt)}</p>
    {w.failureReason && <p className="text-sm text-slate-600">{w.failureReason}</p>}
    <p className="text-sm">Do not send this payment manually or retry it. For an unresolved transfer, check the M-Pesa statement, then record the confirmed outcome below.</p>
    {w.status === "pending" && <button disabled={busy} onClick={send} className="button-primary">Submit pending B2C request</button>}
    {w.status === "pending" && <><label className="block text-sm">Cancellation note<textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><button disabled={busy || note.trim().length < 10} onClick={() => reconcile("failed")} className="text-sm text-rose-700 disabled:opacity-50">Cancel unsubmitted request</button></>}
    {w.status !== "pending" && <>
      <label className="block text-sm">Confirmed M-Pesa receipt<input value={receipt} onChange={e => setReceipt(e.target.value.toUpperCase())} className="ml-2 rounded-lg border p-2" /></label>
      <label className="block text-sm">Statement check / reconciliation note<textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <button disabled={busy || note.trim().length < 10 || !/^[A-Z0-9]{10}$/.test(receipt)} onClick={() => reconcile("paid")} className="button-primary disabled:opacity-50">Record verified paid transfer</button>
      <button disabled={busy || note.trim().length < 10} onClick={() => reconcile("failed")} className="ml-3 text-sm text-rose-700 disabled:opacity-50">Confirm unsuccessful & release balance</button>
    </>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </article>;
  return <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{kes(w.amountKes)} → {w.phoneNumber}</h2><span>{w.status}</span></div><p className="break-all text-xs text-slate-500">{w.orgId ? `Business ${w.orgId}` : `Provider ${w.providerId}`} · {when(w.createdAt)} · Request {w.id}</p>
    {w.status === "pending" ? <button disabled={busy} onClick={() => process("processing")} className="button-primary">Claim for processing</button> : <div className="flex flex-wrap gap-3"><input aria-label="Confirmed M-Pesa receipt" placeholder="M-Pesa receipt" value={receipt} onChange={e => setReceipt(e.target.value.toUpperCase())} className="rounded-lg border p-2" /><button disabled={busy || !/^[A-Z0-9]{10}$/.test(receipt)} onClick={() => process("paid")} className="button-primary disabled:opacity-50">Record confirmed transfer</button></div>}
    <button disabled={busy} onClick={() => process("failed")} className="ml-3 text-sm text-rose-700">{w.status === "pending" ? "Reject request" : "Confirm no funds sent & release balance"}</button>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </article>;
}

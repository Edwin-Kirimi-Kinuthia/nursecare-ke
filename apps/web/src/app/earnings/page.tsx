"use client";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, kes, when } from "@/lib/api";
import { useSection, SectionShell } from "@/components/dashboard/section";
import { PROVIDER_ROLES } from "@carebora/shared";
import Link from "next/link";

export default function EarningsPage() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user) return <div className="p-8"><Link href="/login?next=/earnings">Sign in to view earnings</Link></div>;
  if (user.role !== "vendor" && !PROVIDER_ROLES.includes(user.role)) return <p className="p-8">Earnings are available to providers and business owners.</p>;
  return <EarningsAccount key={user.id} />;
}
function EarningsAccount() {
  const fetcher = useCallback(() => api.getEarnings(), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const requestKey = useRef<string | null>(null);
  async function withdraw(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setNotice("");
    try {
      requestKey.current ??= crypto.randomUUID();
      await api.requestWithdrawal({ amountKes: Number(amount), phoneNumber: phone, requestKey: requestKey.current });
      requestKey.current = null; setAmount(""); setNotice("Withdrawal requested. Track its M-Pesa transfer status below."); await reload();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not request withdrawal"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-sm font-semibold text-teal-700">YOUR BUSINESS ACCOUNT</p><h1 className="mt-2 text-3xl font-semibold">Earnings & withdrawals</h1><p className="mt-3 text-slate-600">Your earnings after platform fees and refunds. Business earnings are accessible to the organization owner.</p>
    <SectionShell loading={loading} error={error} onRetry={reload}>
      {data && <>
        <div className="my-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[["Available to withdraw", data.availableKes], ["Net earnings", data.earnedKes], ["Pending withdrawals", data.pendingKes], ["Paid out", data.paidKes]].map(([label, value]) => <div key={label} className="rounded-2xl border border-teal-100 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-teal-900">{kes(Number(value))}</p></div>)}</div>
        <form onSubmit={withdraw} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Withdraw to M-Pesa</h2><p className="text-sm text-slate-600">{data.withdrawalMode === "mpesa_b2c" ? "Your request is sent to M-Pesa. Your balance stays reserved until the transfer is confirmed. Minimum withdrawal: KES 10." : "The team reviews and sends your transfer. Your balance is reserved until the transfer is confirmed."}</p>
          <label className="block text-sm font-medium">Amount (KES)<input type="number" required min={data.minimumWithdrawalKes} max={Math.min(data.availableKes, 250000)} step={1} disabled={busy} value={amount} onChange={e => { setAmount(e.target.value); requestKey.current = null; }} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
          <label className="block text-sm font-medium">M-Pesa number<input type="tel" required placeholder="0712 345 678" disabled={busy} value={phone} onChange={e => { setPhone(e.target.value); requestKey.current = null; }} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
          <p className="text-xs text-slate-500">Confirm the recipient number before requesting.</p><button type="submit" disabled={busy || data.availableKes < data.minimumWithdrawalKes} className="button-primary disabled:opacity-50">{busy ? "Requesting…" : "Request withdrawal"}</button>
        </form>
        {notice && <p role="status" className="my-4 rounded-xl bg-teal-50 p-4 text-sm">{notice}</p>}
        <h2 className="mb-4 mt-8 text-xl font-semibold">Withdrawal history</h2>
        {!data.withdrawals.length && <p className="text-slate-500">No withdrawals yet.</p>}
        <div className="space-y-3">{data.withdrawals.map(w => <div key={w.id} className="flex flex-wrap justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"><div><p className="font-semibold">{kes(w.amountKes)} · {w.phoneNumber ?? "—"}</p><p className="mt-1 text-xs text-slate-500">{when(w.createdAt)}{w.reference ? ` · ${w.reference}` : ""}</p></div><span className="capitalize text-teal-800">{w.status === "review" ? "Awaiting reconciliation" : w.status}</span>{w.failureReason && <p className="w-full text-sm text-slate-600">{w.failureReason}</p>}</div>)}</div>
      </>}
    </SectionShell>
  </div>;
}

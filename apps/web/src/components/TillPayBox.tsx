"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import { TILL_NUMBER, TILL_NAME } from "@/lib/payments";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

/**
 * Interim Till-payment panel. Shows "Buy Goods" instructions for the CareBora Till,
 * then collects the M-Pesa confirmation code and submits it for admin verification.
 * Used by the appointment, pharmacy-order, and home-visit checkout flows.
 */
export function TillPayBox({
  gatewayRef,
  amountKes,
  noun = "service",
  onSubmitted,
}: {
  gatewayRef: string;
  amountKes: number;
  /** e.g. "consultation", "order", "home visit" — used in the success copy. */
  noun?: string;
  onSubmitted?: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await api.submitTillPayment({ gatewayRef, code });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5" /> Payment submitted
        </div>
        <p className="mt-1 text-emerald-700">
          We&apos;ll confirm your M-Pesa payment and unlock your {noun} shortly. You&apos;ll get a
          notification once it&apos;s verified.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
          <Smartphone className="h-4 w-4" /> Pay {kes(amountKes)} via M-Pesa
        </div>
        <ol className="mt-2 space-y-1 text-sm text-slate-700">
          <li>1. Open <strong>M-Pesa</strong> → <strong>Lipa na M-Pesa</strong> → <strong>Buy Goods and Services</strong></li>
          <li>2. Till Number: <strong className="tracking-wide text-teal-900">{TILL_NUMBER}</strong> <span className="text-slate-500">({TILL_NAME})</span></li>
          <li>3. Amount: <strong>{kes(amountKes)}</strong> → enter your M-Pesa PIN</li>
          <li>4. Copy the confirmation code from the M-Pesa SMS below 👇</li>
        </ol>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">M-Pesa confirmation code</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. SLK5H2X9QA"
          autoCapitalize="characters"
          className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase tracking-wide outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || code.trim().length < 8}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} I&apos;ve paid — submit code
      </button>
      <p className="text-center text-xs text-slate-400">
        Your {noun} unlocks once our team confirms the payment.
      </p>
    </div>
  );
}

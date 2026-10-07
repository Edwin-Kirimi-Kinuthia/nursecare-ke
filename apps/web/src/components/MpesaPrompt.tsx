"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone, CheckCircle2, XCircle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { PaymentStatus } from "@carebora/api-client";
import { api, kes } from "@/lib/api";

/** How long we wait for Safaricom before offering a manual re-check. */
const TIMEOUT_MS = 90_000;
const POLL_MS = 2_500;

/**
 * Turn a gateway failure into something a patient can act on. Daraja's own
 * strings are written for developers ("Failed due to an unresolved reason
 * type."), so showing them raw tells the patient nothing about what to do.
 */
function explainFailure(reason: string | null): { text: string; retryable: boolean } {
  const r = (reason ?? "").toLowerCase();
  if (r.includes("cancel")) return { text: "You cancelled the request on your phone.", retryable: true };
  if (r.includes("insufficient") || r.includes("balance")) {
    return { text: "There wasn't enough money in your M-Pesa account.", retryable: true };
  }
  if (r.includes("wrong pin") || r.includes("invalid pin")) return { text: "That M-Pesa PIN wasn't right.", retryable: true };
  if (r.includes("timeout") || r.includes("expire")) {
    return { text: "The request timed out before you confirmed it.", retryable: true };
  }
  if (r.includes("lock subscriber")) {
    return { text: "Your line was busy with another M-Pesa request. Finish or cancel that one, then try again.", retryable: true };
  }
  if (r.includes("limit")) return { text: "This amount is over your M-Pesa transaction limit.", retryable: false };
  return { text: "M-Pesa couldn't complete the payment.", retryable: true };
}

type Phase = "waiting" | "paid" | "failed" | "timeout";

/**
 * The waiting state after an STK push, shown in place of a one-line "push
 * sent" message.
 *
 * It polls the payment until it settles, so the patient sees the outcome here
 * rather than being told to go and look at their phone and then left guessing
 * whether it worked.
 */
export default function MpesaPrompt({
  paymentId, amountKes, phone, onPaid, onClose,
}: {
  paymentId: string;
  amountKes: number;
  phone: string;
  onPaid?: () => void;
  onClose?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rechecking, setRechecking] = useState(false);
  // Hold onPaid in a ref so a new inline closure on each render doesn't
  // restart the poll loop (which would reset the elapsed clock forever).
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);

  const settle = useCallback((status: PaymentStatus, receiptNumber: string | null, failureReason: string | null) => {
    if (status === "completed") {
      setReceipt(receiptNumber);
      setPhase("paid");
      onPaidRef.current?.();
      return true;
    }
    if (status === "failed" || status === "refunded") {
      setFailure(failureReason);
      setPhase("failed");
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (phase !== "waiting") return;
    let active = true;
    const startedAt = Date.now();

    const tick = async () => {
      if (!active) return;
      const age = Date.now() - startedAt;
      setElapsed(age);
      if (age > TIMEOUT_MS) { setPhase("timeout"); return; }
      try {
        const p = await api.getPayment(paymentId);
        if (!active) return;
        if (settle(p.status, p.receiptNumber, p.failureReason)) return;
      } catch {
        /* a dropped poll is not a failure — keep waiting */
      }
      if (active) timer = setTimeout(tick, POLL_MS);
    };

    let timer = setTimeout(tick, POLL_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [paymentId, phase, settle]);

  async function recheck() {
    setRechecking(true);
    try {
      const p = await api.getPayment(paymentId);
      if (!settle(p.status, p.receiptNumber, p.failureReason)) setPhase("timeout");
    } catch {
      setPhase("timeout");
    } finally {
      setRechecking(false);
    }
  }

  if (phase === "paid") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="mt-3 text-base font-bold text-emerald-900">Payment received</p>
        <p className="mt-0.5 text-sm text-emerald-700">{kes(amountKes)} paid successfully.</p>
        {receipt && (
          <p className="mt-2 inline-block rounded-lg bg-white/70 px-3 py-1 font-mono text-xs text-emerald-800">
            M-Pesa receipt {receipt}
          </p>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  if (phase === "failed") {
    const { text, retryable } = explainFailure(failure);
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100">
          <XCircle className="h-7 w-7 text-rose-600" />
        </div>
        <p className="mt-3 text-base font-bold text-rose-900">Payment not completed</p>
        <p className="mt-0.5 text-sm text-rose-700">{text}</p>
        {retryable && <p className="mt-2 text-xs text-rose-600">Nothing has been charged — you can try again.</p>}
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const timedOut = phase === "timeout";
  const pct = Math.min(100, (elapsed / TIMEOUT_MS) * 100);

  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-5">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {!timedOut && (
            <span className="absolute inset-0 animate-ping rounded-2xl bg-teal-400/30" aria-hidden />
          )}
          <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 text-white">
            <Smartphone className="h-6 w-6" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900">
            {timedOut ? "Still waiting for M-Pesa" : "Approve the payment on your phone"}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {timedOut ? (
              <>We haven&apos;t heard back yet. If you already entered your PIN, check again below.</>
            ) : (
              <>
                We&apos;ve sent a request for <strong className="text-slate-900">{kes(amountKes)}</strong> to{" "}
                <strong className="text-slate-900">{phone}</strong>.
              </>
            )}
          </p>
        </div>
      </div>

      {!timedOut && (
        <>
          <ol className="mt-4 space-y-2 text-sm text-slate-600">
            {[
              "Unlock your phone — an M-Pesa prompt is waiting",
              "Check the amount, then enter your M-Pesa PIN",
              "Stay on this page; it updates by itself",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-teal-100">
            <div className="h-full rounded-full bg-teal-500 transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Waiting for confirmation…
          </p>
        </>
      )}

      {timedOut && (
        <button
          onClick={recheck}
          disabled={rechecking}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {rechecking
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
            : <><RefreshCw className="h-4 w-4" /> Check payment status</>}
        </button>
      )}

      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3 w-3" /> CareBora never sees or stores your M-Pesa PIN
      </p>
    </div>
  );
}

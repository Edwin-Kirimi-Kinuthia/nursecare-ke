"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { Appointment, Review } from "@carebora/api-client";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import StarRatingInput from "@/components/StarRatingInput";

/**
 * Rate a completed appointment. The rating is required, the comment isn't —
 * asking for writing is what stops most people leaving a rating at all.
 */
export default function ReviewModal({
  appointment, onClose, onDone,
}: {
  appointment: Appointment;
  onClose: () => void;
  onDone: (review: Review) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerName = appointment.provider?.user?.fullName ?? "your provider";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please choose a star rating."); return; }
    setBusy(true);
    setError(null);
    try {
      const review = await api.createReview(appointment.id, {
        rating,
        comment: comment.trim() || undefined,
      });
      onDone(review);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">How was your visit?</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Your feedback helps other patients choose {providerName}.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <StarRatingInput value={rating} onChange={(v) => { setRating(v); setError(null); }} size="lg" />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Add a comment <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="What went well? Anything that could have been better?"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">{comment.length}/1000</span>
          </label>

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <p className="text-xs text-slate-400">
            Reviews are shown publicly on your provider&apos;s profile with your name.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Not now
            </button>
            <button
              type="submit"
              disabled={busy || !rating}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60 disabled:shadow-none"
            >
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="h-4 w-4" /> Submit review</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import type { ServiceReviewSubject } from "@carebora/shared";
import type { ServiceReview } from "@carebora/api-client";
import { api } from "@/lib/api";

export default function ServiceReviewForm({ serviceType, subjectId, label }: ServiceReviewSubject & { label: string }) {
  const [review, setReview] = useState<ServiceReview | null>(null);
  const [ready, setReady] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api.getServiceReview({ serviceType, subjectId }).then(r => { if (active) { setReview(r); setReady(true); setError(""); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load your review"); });
    return () => { active = false; };
  }, [serviceType, subjectId, retry]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!rating || busy) return;
    setBusy(true); setError("");
    try { setReview(await api.createServiceReview({ serviceType, subjectId, rating, comment: comment.trim() })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not submit your review"); }
    finally { setBusy(false); }
  }
  if (review) return <p role="status" className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Thank you! You rated {label} {review.rating}/5 stars.</p>;
  if (!ready) return <div className="mt-3 text-sm" role="status">{error ? <><p role="alert">{error}</p><button onClick={() => setRetry(n => n + 1)}>Retry review</button></> : "Loading review…"}</div>;
  return <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
    <h3 className="font-semibold text-teal-950">Rate {label}</h3>
    <p className="text-xs text-slate-600">Share your service experience. Please leave medical details out of your public review.</p>
    <div role="group" aria-label={`Rate ${label}`} className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" aria-label={`${n} ${n === 1 ? "star" : "stars"}`} aria-pressed={rating === n} onClick={() => setRating(n)} className={`h-11 w-11 text-3xl ${n <= rating ? "text-amber-500" : "text-slate-400"}`}>{n <= rating ? "★" : "☆"}</button>)}</div>
    <textarea aria-label={`Review ${label}`} value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} placeholder="Tell us about the service (optional)" className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button disabled={!rating || busy} className="button-primary text-sm disabled:opacity-50">{busy ? "Submitting…" : "Submit review"}</button>
  </form>;
}

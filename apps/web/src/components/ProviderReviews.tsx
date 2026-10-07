"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote } from "lucide-react";
import type { Review } from "@carebora/api-client";
import { api } from "@/lib/api";
import Stars from "@/components/Stars";

const PAGE = 5;

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

/** Patient reviews on a provider's public profile. */
export default function ProviderReviews({
  providerId, ratingAvg, ratingCount,
}: {
  providerId: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.listProviderReviews(providerId, { limit: 50, offset: 0 });
        if (active) { setReviews(res.reviews); setTotal(res.total); }
      } catch {
        if (active) setReviews([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [providerId]);

  if (loading) {
    return (
      <div className="mt-8">
        <div className="h-6 w-40 rounded skeleton" />
        <div className="mt-4 space-y-3">
          <div className="h-20 rounded-2xl skeleton" />
          <div className="h-20 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  // A provider with no reviews yet gets an honest empty state rather than a
  // hidden section — a brand-new clinician looking unrated is fine; looking
  // like the feature is missing is not.
  if (total === 0) {
    return (
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <MessageSquareQuote className="h-5 w-5 text-teal-600" /> Patient reviews
        </h2>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <p className="text-sm text-slate-500">No reviews yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Patients can rate this provider after a completed consultation.
          </p>
        </div>
      </div>
    );
  }

  const shown = expanded ? reviews : reviews.slice(0, PAGE);

  // Distribution bars, so a 4.5 from 40 reviews reads differently from a 4.5 from 2.
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <MessageSquareQuote className="h-5 w-5 text-teal-600" /> Patient reviews
      </h2>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {/* Summary */}
        <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="text-center sm:w-32 sm:shrink-0">
            <div className="text-4xl font-extrabold text-slate-900">{ratingAvg.toFixed(1)}</div>
            <Stars value={Math.round(ratingAvg)} className="mt-1 justify-center" />
            <div className="mt-1 text-xs text-slate-500">
              {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {buckets.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-3 text-right font-medium">{star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual reviews */}
        <ul className="divide-y divide-slate-100">
          {shown.map((r) => (
            <li key={r.id} className="flex gap-3.5 p-5">
              {r.patient.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.patient.avatarUrl}
                  alt={r.patient.fullName}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 font-bold text-teal-700">
                  {initials(r.patient.fullName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-900">{r.patient.fullName}</span>
                  <Stars value={r.rating} />
                  <span className="text-xs text-slate-400">{ago(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                {r.appointment && (
                  <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                    {r.appointment.appointmentType === "home_visit" ? "Home visit" : "Teleconsult"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {reviews.length > PAGE && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full border-t border-slate-100 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
          >
            {expanded ? "Show fewer reviews" : `Show all ${reviews.length} reviews`}
          </button>
        )}
      </div>
    </div>
  );
}

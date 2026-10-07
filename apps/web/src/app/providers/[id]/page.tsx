"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, BadgeCheck, Languages, Stethoscope, CalendarCheck, CheckCircle2, AlertCircle } from "lucide-react";
import type { ProviderPublicProfile, Slot } from "@carebora/api-client";
import { ApiError } from "@carebora/shared";
import { api, kes } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import Stars from "@/components/Stars";
import ProviderReviews from "@/components/ProviderReviews";

function groupByDay(slots: Slot[]) {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = new Date(s.startsAt).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" });
    (map.get(key) ?? map.set(key, []).get(key)!).push(s);
  }
  return [...map.entries()].slice(0, 5);
}

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [provider, setProvider] = useState<ProviderPublicProfile | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([api.getProvider(id), api.listSlots(id, { type: "teleconsult" })]);
        if (active) { setProvider(p); setSlots(s); }
      } catch {
        if (active) setMsg({ kind: "err", text: "Could not load this provider." });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  async function book(slot: Slot) {
    if (!user) { router.push("/login"); return; }
    setBooking(slot.id);
    setMsg(null);
    try {
      await api.createAppointment({ slotId: slot.id });
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
      setMsg({ kind: "ok", text: "Booked! Find it under My appointments." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Booking failed" });
    } finally {
      setBooking(null);
    }
  }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-10"><div className="h-64 rounded-3xl skeleton" /></div>;
  if (!provider) return <p className="mx-auto max-w-4xl px-4 py-16 text-center text-rose-600">Provider not found.</p>;

  const location = [provider.town, provider.county].filter(Boolean).join(", ");
  const groups = groupByDay(slots);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Hero card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="relative h-32 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600">
          <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_15%_20%,white,transparent_40%)]" />
        </div>
        <div className="relative z-10 px-6 pb-6 sm:px-8">
          <div className="flex flex-wrap items-end gap-4">
            {provider.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.user.avatarUrl}
                alt={provider.user.fullName}
                width={96}
                height={96}
                className="-mt-12 h-24 w-24 rounded-3xl border-4 border-white bg-white object-cover object-top shadow-lg"
              />
            ) : (
              <div className="-mt-12 grid h-24 w-24 place-items-center rounded-3xl border-4 border-white bg-gradient-to-br from-teal-100 to-emerald-100 text-4xl font-bold text-teal-700 shadow-lg">
                {provider.user.fullName.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{provider.user.fullName}</h1>
                {provider.verificationStatus === "verified" && <BadgeCheck className="h-5 w-5 text-teal-600" />}
              </div>
              <p className="text-teal-700">{provider.specialty ?? "Clinician"}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Stars value={provider.ratingAvg} />
                  {provider.ratingCount > 0 && <span className="ml-1">{provider.ratingAvg} ({provider.ratingCount})</span>}
                </span>
                {location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {location}</span>}
              </div>
            </div>
            <div className="rounded-2xl bg-teal-50 px-5 py-3 text-center">
              <div className="text-xs text-teal-600">Consultation</div>
              <div className="text-xl font-extrabold text-teal-700">{kes(provider.consultationFeeKes)}</div>
            </div>
          </div>

          {provider.bio && <p className="mt-5 text-slate-600">{provider.bio}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {provider.languages?.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                <Languages className="h-3 w-3" /> {l}
              </span>
            ))}
            {provider.services?.slice(0, 4).map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                <Stethoscope className="h-3 w-3" /> {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Booking */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <CalendarCheck className="h-5 w-5 text-teal-600" /> Book a teleconsultation
        </h2>
        {!user && <p className="mt-1 text-sm text-slate-500">You&apos;ll be asked to log in when you book.</p>}

        {msg && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {msg.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {msg.text}
          </div>
        )}

        {groups.length === 0 ? (
          <p className="mt-4 text-slate-400">No open slots right now.</p>
        ) : (
          <div className="mt-5 space-y-5">
            {groups.map(([day, daySlots]) => (
              <div key={day}>
                <div className="text-sm font-semibold text-slate-700">{day}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {daySlots.slice(0, 12).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => book(s)}
                      disabled={booking === s.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                    >
                      {booking === s.id ? "…" : new Date(s.startsAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProviderReviews
        providerId={id}
        ratingAvg={provider.ratingAvg}
        ratingCount={provider.ratingCount}
      />
    </div>
  );
}

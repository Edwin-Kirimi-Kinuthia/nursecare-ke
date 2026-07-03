"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Video, MapPin, Clock } from "lucide-react";
import type { Appointment } from "@carebora/api-client";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: "Requested", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", cls: "bg-slate-200 text-slate-600" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-700" },
  no_show: { label: "No show", cls: "bg-rose-100 text-rose-700" },
};

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isProvider = !!user && ["doctor", "nurse", "physio", "pharmacy"].includes(user.role);

  async function load() {
    try {
      const res = await api.listAppointments();
      setAppts(res.appointments);
    } catch {
      setAppts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    load();
  }, [user, authLoading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmAppt(id: string) {
    setBusyId(id);
    try { await api.patchAppointment(id, { status: "confirmed" }); await load(); }
    finally { setBusyId(null); }
  }

  async function startConsult(appt: Appointment) {
    setBusyId(appt.id);
    try {
      const c = await api.startConsultation(appt.id);
      router.push(`/consultations/${c.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start consultation");
      setBusyId(null);
    }
  }

  function joinConsult(appt: Appointment) {
    if (appt.consultation?.id) router.push(`/consultations/${appt.consultation.id}`);
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900">
        <CalendarDays className="h-7 w-7 text-teal-600" /> My appointments
      </h1>

      {appts.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <CalendarDays className="h-7 w-7" />
          </div>
          <p className="mt-4 text-slate-500">You have no appointments yet.</p>
          <Link href="/providers" className="mt-4 inline-block rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
            Find a provider
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {appts.map((a) => {
            const st = STATUS[a.status] ?? { label: a.status, cls: "bg-slate-100 text-slate-600" };
            return (
              <div key={a.id} className="card-lift flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 font-bold text-teal-700">
                  {a.provider?.user?.fullName?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900">{a.provider?.user?.fullName ?? "Provider"}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      {a.appointmentType === "home_visit" ? <MapPin className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                      {a.appointmentType === "home_visit" ? "Home visit" : "Teleconsult"}
                    </span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.slot ? when(a.slot.startsAt) : "—"}</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="font-bold text-slate-700">{kes(a.feeKes)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                </div>

                {a.appointmentType === "teleconsult" && (a.status === "requested" || a.status === "confirmed") && (
                  <div className="flex w-full items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {/* Doctor confirms a requested teleconsult */}
                    {isProvider && a.status === "requested" && (
                      <button
                        onClick={() => confirmAppt(a.id)}
                        disabled={busyId === a.id}
                        className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                      >
                        {busyId === a.id ? "…" : "Confirm"}
                      </button>
                    )}
                    {/* Doctor starts / resumes the consultation */}
                    {isProvider && a.status === "confirmed" && (
                      <button
                        onClick={() => startConsult(a)}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                      >
                        <Video className="h-4 w-4" /> {a.consultation ? "Resume consultation" : "Start consultation"}
                      </button>
                    )}
                    {/* Patient joins once the doctor has started */}
                    {!isProvider && a.consultation && a.consultation.status !== "ended" && (
                      <button
                        onClick={() => joinConsult(a)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                      >
                        <Video className="h-4 w-4" /> Join consultation
                      </button>
                    )}
                    {!isProvider && a.status === "confirmed" && !a.consultation && (
                      <span className="text-xs text-slate-400">Waiting for the doctor to start…</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

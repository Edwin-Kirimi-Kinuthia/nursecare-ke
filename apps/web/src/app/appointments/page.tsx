"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Video, MapPin, Clock, CheckCircle2, Loader2, Star } from "lucide-react";
import type { Appointment } from "@carebora/api-client";
import { ApiError } from "@carebora/shared";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { IS_TILL_MODE, IS_MPESA_SANDBOX } from "@/lib/payments";
import { TillPayBox } from "@/components/TillPayBox";
import Stars from "@/components/Stars";
import PageHeader from "@/components/PageHeader";
import ReviewModal from "@/components/ReviewModal";
import MpesaPrompt from "@/components/MpesaPrompt";
import { PhoneField } from "@/components/PhoneField";
import EmptyState from "@/components/EmptyState";

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

  // pay modal
  const [payAppt, setPayAppt] = useState<Appointment | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [simCheckoutId, setSimCheckoutId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [reviewAppt, setReviewAppt] = useState<Appointment | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  /**
   * Which side of a given appointment the viewer is on.
   *
   * Decided per appointment rather than from the account's role, because any
   * account can now book care — a doctor viewing a consultation they booked
   * for themselves is the patient there and needs Pay and Join, not Confirm
   * and Start.
   */
  const actingAsProvider = (a: Appointment) => !!user && a.providerId === user.id;

  async function load() {
    try {
      const res = await api.listAppointments();
      setAppts(res.appointments);
      return res.appointments;
    } catch {
      setAppts([]);
      return [] as Appointment[];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    queueMicrotask(async () => {
      const list = await load();

      // Arriving from a fresh booking (?pay=<id>): go straight to paying, since
      // the fee is what lets the patient be seen. One-shot — the param is
      // removed so a refresh doesn't reopen it.
      const payId = new URLSearchParams(window.location.search).get("pay");
      if (!payId) return;
      window.history.replaceState(null, "", window.location.pathname);
      const target = list.find((a) => a.id === payId);
      if (target && target.status === "confirmed" && target.feeKes > 0
          && target.payment?.status !== "completed" && target.providerId !== user.id) {
        setPayAppt(target); setPayMsg(null); setSimCheckoutId(null);
        setPendingPaymentId(null); setPayPhone(user.phone ?? "");
      }
    });
  }, [user, authLoading, router]);

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

  function openPay(appt: Appointment) {
    setPayAppt(appt); setPayMsg(null); setSimCheckoutId(null); setPendingPaymentId(null); setPayPhone(user?.phone ?? "");
  }

  async function payAppointment() {
    if (!payAppt) return;
    setPaying(true); setPayMsg(null); setSimCheckoutId(null); setPendingPaymentId(null);
    try {
      const payment = await api.initiateMpesaPayment({ appointmentId: payAppt.id, phoneNumber: payPhone });
      // MpesaPrompt takes over from here: it polls the payment and reports the
      // real outcome, rather than telling the patient to go and look at their
      // phone and leaving them to guess whether it worked.
      if (!IS_TILL_MODE) setPendingPaymentId(payment.id);
      setSimCheckoutId(payment.gatewayRef ?? null);
      await load();
    } catch (err) {
      setPayMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Payment failed." });
    } finally { setPaying(false); }
  }

  async function simulatePay() {
    if (!simCheckoutId) return;
    setSimulating(true);
    try {
      await api.simulateMpesaPayment(simCheckoutId);
      setPayMsg({ kind: "ok", text: "Payment received ✓ — your appointment is paid." });
      setSimCheckoutId(null);
      await load();
      setTimeout(() => setPayAppt(null), 1500);
    } catch (err) {
      setPayMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Simulation failed." });
    } finally { setSimulating(false); }
  }

  function joinConsult(appt: Appointment) {
    if (appt.consultation?.id) router.push(`/consultations/${appt.consultation.id}`);
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow="Consultations"
        Icon={CalendarDays}
        title="My appointments"
        lede="Your upcoming and past consultations, home visits and the records that came out of them."
      />

      {appts.length === 0 ? (
        <EmptyState
          className="mt-8"
          Icon={CalendarDays}
          title="No appointments yet"
          hint="Book a consultation and it will appear here, along with any notes or prescriptions from it."
          action={
            <Link href="/providers" className="inline-block rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700">
              Find a provider
            </Link>
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {appts.map((a) => {
            const st = STATUS[a.status] ?? { label: a.status, cls: "bg-slate-100 text-slate-600" };
            const isProvider = actingAsProvider(a);
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

                {/* Rate a finished appointment — the patient's side only. */}
                {a.status === "completed" && !isProvider && (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    {a.review ? (
                      <div className="mr-auto flex items-center gap-2 text-sm text-slate-500">
                        <span>You rated this visit</span>
                        <Stars value={a.review.rating} />
                      </div>
                    ) : (
                      <>
                        <span className="mr-auto text-sm text-slate-500">How was your visit?</span>
                        <button
                          onClick={() => setReviewAppt(a)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                        >
                          <Star className="h-4 w-4" /> Rate your visit
                        </button>
                      </>
                    )}
                  </div>
                )}
                {/* A provider sees the rating they were given. */}
                {a.status === "completed" && isProvider && a.review && (
                  <div className="flex w-full items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
                    <span>Patient rating</span>
                    <Stars value={a.review.rating} />
                    {a.review.comment && <span className="truncate italic">“{a.review.comment}”</span>}
                  </div>
                )}

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
                    {isProvider && a.status === "confirmed" && a.feeKes > 0 && a.payment?.status !== "completed" && !a.consultation && (
                      // Paid before seen: nothing to start until the fee is in.
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        <Clock className="h-3.5 w-3.5" /> Waiting for the patient to pay
                      </span>
                    )}
                    {isProvider && a.status === "confirmed" && (a.feeKes <= 0 || a.payment?.status === "completed" || !!a.consultation) && (
                      <button
                        onClick={() => startConsult(a)}
                        disabled={busyId === a.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                      >
                        <Video className="h-4 w-4" /> {a.consultation ? "Resume consultation" : "Start consultation"}
                      </button>
                    )}
                    {/* Patient pays for a confirmed teleconsult */}
                    {!isProvider && a.status === "confirmed" && (
                      a.payment?.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                      ) : a.payment?.status === "awaiting_verification" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          <Clock className="h-3.5 w-3.5" /> Verifying payment
                        </span>
                      ) : (
                        <button
                          onClick={() => openPay(a)}
                          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                        >
                          Pay {kes(a.feeKes)}
                        </button>
                      )
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
                    {!isProvider && a.status === "requested" && (
                      <span className="text-xs text-slate-500">
                        Waiting for {a.provider?.user?.fullName ?? "the provider"} to confirm — you&apos;ll pay once they do.
                      </span>
                    )}
                    {/* Only once paid — before that the next step is paying, not waiting. */}
                    {!isProvider && a.status === "confirmed" && !a.consultation && a.payment?.status === "completed" && (
                      <span className="text-xs text-slate-500">Paid — waiting for the doctor to start…</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewAppt && (
        <ReviewModal
          appointment={reviewAppt}
          onClose={() => setReviewAppt(null)}
          onDone={(review) => {
            // Patch it in locally so the card flips to "You rated this visit"
            // without a full reload.
            setAppts((prev) =>
              prev.map((a) =>
                a.id === reviewAppt.id
                  ? { ...a, review: { id: review.id, rating: review.rating, comment: review.comment } }
                  : a,
              ),
            );
            setReviewAppt(null);
          }}
        />
      )}

      {/* Pay modal */}
      {payAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPayAppt(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Pay for your consultation</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payAppt.provider?.user?.fullName} · <span className="font-semibold text-slate-700">{kes(payAppt.feeKes)}</span>
            </p>
            <div className="mt-4 space-y-3">
              {/* Till mode, step 2: show the manual pay + code-entry box */}
              {IS_TILL_MODE && simCheckoutId ? (
                <>
                  <TillPayBox
                    gatewayRef={simCheckoutId}
                    amountKes={payAppt.feeKes}
                    noun="consultation"
                    onSubmitted={load}
                  />
                  <button onClick={() => setPayAppt(null)}
                    className="w-full rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Close
                  </button>
                </>
              ) : (
                <>
                  {pendingPaymentId ? (
                    <MpesaPrompt
                      paymentId={pendingPaymentId}
                      amountKes={payAppt.feeKes}
                      phone={payPhone}
                      onPaid={load}
                      onClose={() => { setPendingPaymentId(null); setPayAppt(null); }}
                    />
                  ) : (
                    <PhoneField label="M-Pesa phone" value={payPhone} onChange={setPayPhone} required lockedToKenya />
                  )}
                  {payMsg && (
                    <p className={`rounded-xl px-4 py-3 text-sm ${payMsg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{payMsg.text}</p>
                  )}
                  {simCheckoutId && !IS_TILL_MODE && IS_MPESA_SANDBOX && (
                    <button onClick={simulatePay} disabled={simulating}
                      className="w-full rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
                      {simulating ? "Completing…" : "Simulate M-Pesa payment (sandbox)"}
                    </button>
                  )}
                  {!pendingPaymentId && (
                    <div className="flex gap-3">
                      <button onClick={payAppointment} disabled={paying}
                        className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                        {paying && <Loader2 className="h-4 w-4 animate-spin" />} {IS_TILL_MODE ? "Continue to pay" : `Pay ${kes(payAppt.feeKes)}`}
                      </button>
                      <button onClick={() => setPayAppt(null)}
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

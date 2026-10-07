"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home, Stethoscope, Clock, CheckCircle2, XCircle, AlertCircle,
  MapPin, Phone, Banknote, ChevronRight, Loader2,
} from "lucide-react";
import type { HomeVisit } from "@carebora/api-client";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { IS_TILL_MODE, IS_MPESA_SANDBOX } from "@/lib/payments";
import { TillPayBox } from "@/components/TillPayBox";
import { PhoneField } from "@/components/PhoneField";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-700" },
  awaiting_verification: { label: "Verifying payment", cls: "bg-orange-100 text-orange-700" },
  assigned:  { label: "Assigned",  cls: "bg-indigo-100 text-indigo-700" },
  paid:      { label: "Paid",      cls: "bg-blue-100 text-blue-700" },
  en_route:  { label: "En route",  cls: "bg-violet-100 text-violet-700" },
  arrived:   { label: "Arrived",   cls: "bg-teal-100 text-teal-700" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500" },
};

export default function HomeVisitsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [visits, setVisits] = useState<HomeVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "request">("list");

  // request form
  const [specialty, setSpecialty] = useState<"nurse" | "physio" | "doctor">("nurse");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("routine");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [county, setCounty] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // pay modal
  const [payVisit, setPayVisit] = useState<HomeVisit | null>(null);
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [simCheckoutId, setSimCheckoutId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    load();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const res = await api.listHomeVisits({ limit: 50 });
      setVisits(res.visits);
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      await api.requestHomeVisit({
        specialty,
        urgency,
        description,
        address,
        county,
        contactPhone,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      setMsg({ kind: "ok", text: "Request submitted! Our team will assign a provider and contact you shortly." });
      setDescription(""); setAddress(""); setCounty(""); setScheduledAt("");
      await load();
      setTimeout(() => setView("list"), 2000);
    } catch (err: unknown) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  }

  async function payNow(e: React.FormEvent) {
    e.preventDefault();
    if (!payVisit) return;
    setPayMsg(null);
    setPaying(true);
    setSimCheckoutId(null);
    try {
      const updated = await api.payHomeVisit(payVisit.id, { phoneNumber: phone });
      if (!IS_TILL_MODE) setPayMsg("STK push sent! Check your phone and enter your M-Pesa PIN.");
      setSimCheckoutId(updated.payment?.gatewayRef ?? null);
      await load();
    } catch (err: unknown) {
      setPayMsg(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  async function simulatePay() {
    if (!simCheckoutId) return;
    setSimulating(true);
    try {
      await api.simulateMpesaPayment(simCheckoutId);
      setPayMsg("Payment received ✓ — your visit is paid.");
      setSimCheckoutId(null);
      await load();
      setTimeout(() => setPayVisit(null), 1500);
    } catch (err: unknown) {
      setPayMsg(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-16"><div className="h-40 rounded-2xl skeleton" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
            <Home className="h-4 w-4" /> Home-Based Care
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Home visits</h1>
          <p className="mt-1 text-slate-500 text-sm">Request a nurse, physiotherapist, or doctor to visit you at home.</p>
        </div>
        {view === "list" && user.role === "patient" && (
          <button
            onClick={() => { setView("request"); setMsg(null); }}
            className="shrink-0 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            + Request visit
          </button>
        )}
      </div>

      {/* Request form */}
      {view === "request" && (
        <form onSubmit={submitRequest} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-900 text-lg">New home visit request</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Specialist type</label>
              <select value={specialty} onChange={e => setSpecialty(e.target.value as typeof specialty)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="nurse">Nurse — home-based care</option>
                <option value="physio">Physiotherapist — home session</option>
                <option value="doctor">Doctor — home consultation</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">
                {specialty === "nurse" && "Wound care, injections, elderly & post-op nursing at home."}
                {specialty === "physio" && "Rehabilitation and mobility sessions in the comfort of your home."}
                {specialty === "doctor" && "A doctor comes to you for an in-person assessment."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value as typeof urgency)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="routine">Routine — within a few days</option>
                <option value="urgent">Urgent — same day</option>
                <option value="emergency">Emergency — as soon as possible</option>
              </select>
              {urgency === "emergency" && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5" /> For life-threatening emergencies, call 999 / 112 first.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Describe your needs</label>
            <textarea required minLength={10} value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Describe your symptoms or what care you need…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full address</label>
            <input required value={address} onChange={e => setAddress(e.target.value)}
              placeholder="e.g. House 12, Maple Avenue, Westlands"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">County</label>
              <input required value={county} onChange={e => setCounty(e.target.value)}
                placeholder="e.g. Nairobi"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred date &amp; time (optional)</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <PhoneField
            label="Contact phone"
            value={contactPhone}
            onChange={setContactPhone}
            required
            hint="The nurse or doctor visiting you will call this number."
          />

          {msg && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {msg.kind === "ok" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              {msg.text}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit request
            </button>
            <button type="button" onClick={() => setView("list")}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Visit list */}
      {view === "list" && (
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="h-40 rounded-2xl skeleton" />
          ) : visits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
              <Home className="mx-auto h-8 w-8 mb-3 opacity-40" />
              <p className="font-medium">No home visits yet</p>
              {user.role === "patient" && <p className="text-sm mt-1">Request your first visit above.</p>}
            </div>
          ) : visits.map((v) => (
            <VisitCard key={v.id} visit={v} onPay={() => { setPayVisit(v); setPayMsg(null); setSimCheckoutId(null); }} />
          ))}
        </div>
      )}

      {/* Pay modal */}
      {payVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="font-bold text-slate-900 text-lg">Pay for home visit</h2>
            <div className="mt-2 text-sm text-slate-500">
              Provider: <span className="font-medium text-slate-700">{payVisit.provider?.user.fullName ?? "—"}</span>
            </div>
            <div className="mt-1 text-2xl font-extrabold text-teal-700">{kes(payVisit.feeKes)}</div>

            {IS_TILL_MODE && simCheckoutId ? (
              <div className="mt-4 space-y-3">
                <TillPayBox
                  gatewayRef={simCheckoutId}
                  amountKes={payVisit.feeKes ?? 0}
                  noun="home visit"
                  onSubmitted={load}
                />
                <button type="button" onClick={() => setPayVisit(null)}
                  className="w-full rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={payNow} className="mt-4 space-y-4">
                <PhoneField label="M-Pesa phone number" value={phone} onChange={setPhone} required lockedToKenya />
                {payMsg && (
                  <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{payMsg}</p>
                )}
                {simCheckoutId && !IS_TILL_MODE && IS_MPESA_SANDBOX && (
                  <button type="button" onClick={simulatePay} disabled={simulating}
                    className="w-full rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
                    {simulating ? "Completing…" : "Simulate M-Pesa payment (sandbox)"}
                  </button>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={paying}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                    {paying && <Loader2 className="h-4 w-4 animate-spin" />}
                    {IS_TILL_MODE ? "Continue to pay" : `Pay ${kes(payVisit.feeKes)}`}
                  </button>
                  <button type="button" onClick={() => setPayVisit(null)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VisitCard({ visit, onPay }: { visit: HomeVisit; onPay: () => void }) {
  const meta = STATUS_META[visit.status] ?? STATUS_META.pending;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold text-slate-900 capitalize">{visit.specialty} visit</div>
            <div className="text-xs text-slate-400">{when(visit.createdAt)}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {visit.urgency === "emergency" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
              <AlertCircle className="h-3 w-3" /> Emergency
            </span>
          )}
          {visit.urgency === "urgent" && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Urgent</span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600 line-clamp-2">{visit.description}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{visit.address}, {visit.county}</span>
        {visit.scheduledAt && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{when(visit.scheduledAt)}</span>}
        {visit.feeKes && <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" />{kes(visit.feeKes)}</span>}
        {visit.provider && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{visit.provider.user.fullName}</span>}
      </div>

      {visit.status === "assigned" && (
        <button onClick={onPay}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Pay {kes(visit.feeKes)} via M-Pesa <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {visit.payment?.receiptNumber && (
        <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Receipt: <span className="font-mono font-semibold">{visit.payment.receiptNumber}</span>
        </div>
      )}

      {visit.visitNotes && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold">Provider notes: </span>{visit.visitNotes}
        </div>
      )}

      {visit.status === "cancelled" && visit.payment?.failureReason && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
          <XCircle className="h-3.5 w-3.5" /> {visit.payment.failureReason}
        </div>
      )}
    </div>
  );
}

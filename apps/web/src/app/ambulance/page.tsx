"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Siren, MapPin, Phone, Clock, CheckCircle2, XCircle, AlertCircle, LocateFixed, Loader2, Ambulance as AmbulanceIcon,
} from "lucide-react";
import type { AmbulanceRequest, AmbulanceType } from "@carebora/api-client";
import { KENYA_COUNTIES } from "@carebora/shared";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useLocation } from "@/components/LocationProvider";
import { IS_TILL_MODE, IS_MPESA_SANDBOX } from "@/lib/payments";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";
import { TillPayBox } from "@/components/TillPayBox";
import { PhoneField } from "@/components/PhoneField";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  requested: { label: "Finding an operator…", cls: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", cls: "bg-indigo-100 text-indigo-700" },
  dispatched: { label: "Dispatched", cls: "bg-blue-100 text-blue-700" },
  en_route_pickup: { label: "En route to you", cls: "bg-violet-100 text-violet-700" },
  arrived_pickup: { label: "Arrived", cls: "bg-teal-100 text-teal-700" },
  en_route_destination: { label: "En route to destination", cls: "bg-violet-100 text-violet-700" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500" },
};

const TYPES: { value: AmbulanceType; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "advanced_life_support", label: "Advanced Life Support" },
  { value: "icu", label: "ICU" },
  { value: "neonatal", label: "Neonatal" },
];

export default function AmbulancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { lat, lng, requestPreciseLocation, loading: locating } = useLocation();

  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "request">("list");

  const [type, setType] = useState<AmbulanceType>("basic");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("emergency");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCounty, setPickupCounty] = useState<(typeof KENYA_COUNTIES)[number]>("Nairobi");
  const [destinationName, setDestinationName] = useState("");
  const [patientCondition, setPatientCondition] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [payReq, setPayReq] = useState<AmbulanceRequest | null>(null);
  const [payPhone, setPayPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [simGatewayRef, setSimGatewayRef] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    load();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const res = await api.listAmbulanceRequests({ limit: 50 });
      setRequests(res.requests);
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (lat == null || lng == null) {
      setMsg({ kind: "err", text: "Share your pickup location first — tap \"Use my current location\"." });
      return;
    }
    setMsg(null); setSubmitting(true);
    try {
      await api.requestAmbulance({
        type, urgency, pickupAddress, pickupCounty,
        pickupLatitude: lat, pickupLongitude: lng,
        destinationName: destinationName || undefined,
        patientCondition, contactPhone,
      });
      setMsg({ kind: "ok", text: "Request sent! We're matching you with the nearest available operator." });
      setPickupAddress(""); setDestinationName(""); setPatientCondition("");
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
    if (!payReq) return;
    setPayMsg(null); setPaying(true); setSimGatewayRef(null);
    try {
      const payment = await api.payAmbulanceRequest(payReq.id, payPhone);
      if (!IS_TILL_MODE) setPayMsg("STK push sent! Check your phone and enter your M-Pesa PIN.");
      setSimGatewayRef(payment.gatewayRef ?? null);
      await load();
    } catch (err: unknown) {
      setPayMsg(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  async function simulatePay() {
    if (!simGatewayRef) return;
    setSimulating(true);
    try {
      await api.simulateMpesaPayment(simGatewayRef);
      setPayMsg("Payment received ✓");
      setSimGatewayRef(null);
      await load();
      setTimeout(() => setPayReq(null), 1500);
    } catch (err: unknown) {
      setPayMsg(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  async function cancelRequest(r: AmbulanceRequest) {
    if (!confirm("Cancel this ambulance request?")) return;
    try { await api.cancelAmbulanceRequest(r.id, "Cancelled by patient"); await load(); }
    catch (err) { alert(err instanceof Error ? err.message : "Failed to cancel"); }
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          <Siren className="h-7 w-7 shrink-0 text-rose-600" /> Ambulance
        </h1>
        {view === "list" && (
          <button onClick={() => setView("request")} className="shrink-0 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 hover:bg-rose-700">
            Request ambulance
          </button>
        )}
      </div>

      {/* Calling is always the fastest path in a real emergency — offered before
          the request form, and on every view, so it's never more than one tap away. */}
      <a
        href={`tel:${AMBULANCE_PHONE}`}
        className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-500/25">
          <Phone className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-rose-900">Life-threatening? Call now</span>
          <span className="block text-sm text-rose-700">
            Speak to our dispatch team on {AMBULANCE_PHONE_DISPLAY} — faster than filling the form below.
          </span>
        </span>
      </a>

      {view === "request" ? (
        <form onSubmit={submitRequest} className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ambulance type</label>
              <select value={type} onChange={(e) => setType(e.target.value as AmbulanceType)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as typeof urgency)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
                <option value="routine">Routine transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pickup location</label>
            <button type="button" onClick={requestPreciseLocation} disabled={locating}
              className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
              {lat != null ? "Location captured ✓" : "Use my current location"}
            </button>
            {lat == null && <p className="mb-2 text-xs text-amber-600">Required — we dispatch the nearest available operator to this point.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <input required value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Street address / landmark"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
              <select value={pickupCounty} onChange={(e) => setPickupCounty(e.target.value as typeof pickupCounty)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <input value={destinationName} onChange={(e) => setDestinationName(e.target.value)} placeholder="Destination hospital (optional)"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          <textarea required value={patientCondition} onChange={(e) => setPatientCondition(e.target.value)} rows={2}
            placeholder="What's happening? (e.g. chest pain, road accident, difficulty breathing)"
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
          <PhoneField
            label="Contact phone"
            value={contactPhone}
            onChange={setContactPhone}
            required
            hint="The crew will call this number on the way to you."
          />

          {msg && (
            <p className={`rounded-xl px-4 py-2.5 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 hover:bg-rose-700 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Send request
            </button>
            <button type="button" onClick={() => setView("list")} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <AmbulanceIcon className="h-7 w-7" />
          </div>
          <p className="mt-4 text-slate-500">No ambulance requests yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.requested!;
            const canPay = r.status === "completed" && r.feeKes && r.payment?.status !== "completed";
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize text-slate-900">{r.type.replace(/_/g, " ")}</span>
                      {r.urgency === "emergency" && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">Emergency</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{when(r.createdAt)}</div>
                    <div className="mt-2 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5" /> {r.pickupAddress}, {r.pickupCounty}</div>
                    {r.destinationName && <div className="mt-0.5 text-sm text-slate-500">→ {r.destinationName}</div>}
                    <p className="mt-1 text-sm text-slate-600">{r.patientCondition}</p>
                    {r.organization && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" /> {r.organization.name}{r.organization.contactPhone ? ` · ${r.organization.contactPhone}` : ""}</div>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                </div>

                {r.events.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {r.events.map((e) => (
                      <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" /> {(STATUS_META[e.status] ?? { label: e.status }).label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {(r.status === "requested" || r.status === "accepted") && (
                    <button onClick={() => cancelRequest(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  )}
                  {canPay && (
                    <button onClick={() => { setPayReq(r); setPayMsg(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                      Pay {kes(r.feeKes ?? 0)}
                    </button>
                  )}
                  {r.payment?.status === "completed" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {payReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Pay for ambulance service</h2>
            <div className="mt-1 text-2xl font-extrabold text-teal-700">{kes(payReq.feeKes ?? 0)}</div>

            {IS_TILL_MODE && simGatewayRef ? (
              <div className="mt-4 space-y-3">
                <TillPayBox gatewayRef={simGatewayRef} amountKes={payReq.feeKes ?? 0} noun="ambulance service" onSubmitted={load} />
                <button type="button" onClick={() => setPayReq(null)} className="w-full rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
              </div>
            ) : (
              <form onSubmit={payNow} className="mt-4 space-y-4">
                <PhoneField label="M-Pesa phone number" value={payPhone} onChange={setPayPhone} required lockedToKenya />
                {payMsg && <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{payMsg}</p>}
                {simGatewayRef && !IS_TILL_MODE && IS_MPESA_SANDBOX && (
                  <button type="button" onClick={simulatePay} disabled={simulating}
                    className="w-full rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
                    {simulating ? "Completing…" : "Simulate M-Pesa payment (sandbox)"}
                  </button>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={paying} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                    {paying && <Loader2 className="h-4 w-4 animate-spin" />} Pay
                  </button>
                  <button type="button" onClick={() => setPayReq(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            )}
            {!IS_TILL_MODE && !simGatewayRef && (
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><AlertCircle className="h-3 w-3" /> STK push, once sent, will show a sandbox-simulate button.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

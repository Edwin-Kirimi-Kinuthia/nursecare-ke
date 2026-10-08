"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { NearbyLab, LabTest, LabOrder } from "@carebora/api-client";
import { ApiError } from "@carebora/shared";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useLocation } from "@/components/LocationProvider";
import { IS_TILL_MODE, IS_MPESA_SANDBOX } from "@/lib/payments";
import { TillPayBox } from "@/components/TillPayBox";
import MpesaPrompt from "@/components/MpesaPrompt";
import { PhoneField } from "@/components/PhoneField";
import PageHeader from "@/components/PageHeader";

export default function LabsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { lat, lng } = useLocation();

  const [labs, setLabs] = useState<NearbyLab[]>([]);
  const [selectedLab, setSelectedLab] = useState<NearbyLab | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"browse" | "orders">("browse");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pendingGatewayRef, setPendingGatewayRef] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    loadLabs();
    loadOrders();
  }, [user, authLoading, lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLabs() {
    setLoading(true);
    try {
      const res = await api.nearbyLabs(lat != null && lng != null ? { lat, lng } : {});
      setLabs(res.labs);
    } finally { setLoading(false); }
  }
  async function loadOrders() {
    const res = await api.listLabOrders({ limit: 50 });
    setOrders(res.orders);
  }

  async function openLab(lab: NearbyLab) {
    setSelectedLab(lab);
    setSelectedTestIds([]);
    const res = await api.labTestsFor(lab.orgId);
    setTests(res.tests);
  }

  function toggleTest(id: string) {
    setSelectedTestIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const total = tests.filter((t) => selectedTestIds.includes(t.id)).reduce((s, t) => s + t.priceKes, 0);

  async function checkout() {
    if (!selectedLab || selectedTestIds.length === 0) return;
    setCheckingOut(true); setMsg(null); setPendingGatewayRef(null); setPendingPaymentId(null);
    try {
      const order = await api.createLabOrder({ orgId: selectedLab.orgId, testIds: selectedTestIds, phoneNumber, collectionType: "walk_in" });
      // MpesaPrompt polls from here and reports the real outcome.
      if (!IS_TILL_MODE) setPendingPaymentId(order.payment?.id ?? null);
      setPendingGatewayRef(order.payment?.gatewayRef ?? null);
      setPendingAmount(total);
      await loadOrders();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Checkout failed" });
    } finally { setCheckingOut(false); }
  }

  async function simulatePay() {
    if (!pendingGatewayRef) return;
    setSimulating(true);
    try {
      await api.simulateMpesaPayment(pendingGatewayRef);
      setMsg({ kind: "ok", text: "Payment received ✓" });
      setPendingGatewayRef(null);
      setSelectedLab(null);
      await loadOrders();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Simulation failed" });
    } finally { setSimulating(false); }
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow="Diagnostics"
        Icon={FlaskConical}
        title="Lab tests"
        lede="Book tests at an approved laboratory near you and get results in your medical record."
        action={
          <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button onClick={() => setView("browse")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === "browse" ? "bg-teal-600 text-white" : "text-slate-600"}`}>Browse</button>
          <button onClick={() => setView("orders")} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === "orders" ? "bg-teal-600 text-white" : "text-slate-600"}`}>My orders</button>
          </div>
        }
      />

      {view === "browse" ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {labs.map((lab) => (
              <button key={lab.orgId} onClick={() => openLab(lab)}
                className={`rounded-2xl border p-4 text-left transition ${selectedLab?.orgId === lab.orgId ? "border-teal-500 bg-teal-50/40" : "border-slate-200 bg-white hover:border-teal-300"}`}>
                <div className="font-semibold text-slate-900">{lab.orgName}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {lab.branchName}, {lab.county}{lab.distanceKm != null ? ` · ${lab.distanceKm.toFixed(1)}km` : ""}</div>
              </button>
            ))}
            {labs.length === 0 && <p className="text-sm text-slate-400">No labs found nearby. Try sharing your location or a different county.</p>}
          </div>

          {selectedLab && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">{selectedLab.orgName} — test menu</h2>
              <div className="mt-3 space-y-2">
                {tests.map((t) => (
                  <label key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedTestIds.includes(t.id)} onChange={() => toggleTest(t.id)} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
                      <span className="font-medium text-slate-800">{t.name}</span>
                      <span className="text-xs text-slate-400">{t.category}</span>
                    </span>
                    <span className="font-semibold text-teal-700">{kes(t.priceKes)}</span>
                  </label>
                ))}
                {tests.length === 0 && <p className="text-sm text-slate-400">No tests listed yet.</p>}
              </div>

              {selectedTestIds.length > 0 && !pendingGatewayRef && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="text-xl font-extrabold text-teal-700">{kes(total)}</span>
                  </div>
                  <PhoneField label="M-Pesa phone" value={phoneNumber} onChange={setPhoneNumber} required lockedToKenya />
                  <button onClick={checkout} disabled={checkingOut}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/25 hover:bg-teal-700 disabled:opacity-60">
                    {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />} Pay {kes(total)}
                  </button>
                </div>
              )}

              {msg && (
                <p className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {msg.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {msg.text}
                </p>
              )}

              {pendingPaymentId && !IS_TILL_MODE && (
                <div className="mt-4">
                  <MpesaPrompt
                    paymentId={pendingPaymentId}
                    amountKes={pendingAmount}
                    phone={phoneNumber}
                    onPaid={loadOrders}
                    onClose={() => { setPendingPaymentId(null); setPendingGatewayRef(null); setSelectedLab(null); }}
                  />
                </div>
              )}

              {pendingGatewayRef && IS_TILL_MODE && (
                <div className="mt-4"><TillPayBox gatewayRef={pendingGatewayRef} amountKes={pendingAmount} noun="lab order" onSubmitted={loadOrders} /></div>
              )}
              {pendingGatewayRef && !IS_TILL_MODE && IS_MPESA_SANDBOX && (
                <button onClick={simulatePay} disabled={simulating}
                  className="mt-3 w-full rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
                  {simulating ? "Completing…" : "Simulate M-Pesa payment (sandbox)"}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.length === 0 ? (
            <p className="text-sm text-slate-400">No lab orders yet.</p>
          ) : orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{o.organization.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{when(o.createdAt)}</div>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {o.items.map((i) => (
                      <li key={i.id} className="flex items-center gap-2">
                        {i.testName}
                        {i.result && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.result.flag === "critical" ? "bg-rose-100 text-rose-700" : i.result.flag === "high" || i.result.flag === "low" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {i.result.value}{i.result.unit ? ` ${i.result.unit}` : ""}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{o.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

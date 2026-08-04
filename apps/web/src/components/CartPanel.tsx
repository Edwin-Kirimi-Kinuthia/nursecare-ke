"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle, CheckCircle2, ShieldCheck, Upload, Stethoscope, FileCheck2 } from "lucide-react";
import type { Listing } from "@carebora/api-client";
import { ApiError } from "@carebora/shared";
import { api, kes } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import { IS_TILL_MODE } from "@/lib/payments";
import { TillPayBox } from "@/components/TillPayBox";

/** The cart + M-Pesa checkout. Self-contained — fetches product details for the
 *  items in the cart, so it works from anywhere (used inside the cart drawer). */
export default function CartPanel({ onOrdered }: { onOrdered?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const { items, add, sub, remove, clear, closeCart } = useCart();

  const [catalog, setCatalog] = useState<Record<string, Listing & { organization: { id: string; name: string } }>>({});
  const [phone, setPhone] = useState("0708374149");
  const [address, setAddress] = useState("");
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [rxName, setRxName] = useState("");
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pendingCheckoutId, setPendingCheckoutId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load listing details for any cart items we don't yet know about.
  useEffect(() => {
    const missing = Object.keys(items).filter((id) => !catalog[id]);
    if (missing.length === 0) return;
    let active = true;
    (async () => {
      const fetched = await Promise.all(missing.map((id) => api.getListing(id).catch(() => null)));
      if (!active) return;
      setCatalog((c) => {
        const next = { ...c };
        fetched.forEach((l) => { if (l) next[l.id] = l; });
        return next;
      });
    })();
    return () => { active = false; };
  }, [items, catalog]);

  const lines = Object.entries(items).filter(([id]) => catalog[id]);
  const total = lines.reduce((sum, [id, q]) => sum + (catalog[id]?.priceKes ?? 0) * q, 0);
  const hasRx = lines.some(([id]) => catalog[id]?.drug.requiresPrescription);
  const rxSatisfied = !hasRx || !!rxImage;

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) { setMsg({ kind: "err", text: "Prescription image must be under 4 MB." }); return; }
    const reader = new FileReader();
    reader.onload = () => { setRxImage(reader.result as string); setRxName(file.name); setMsg(null); };
    reader.readAsDataURL(file);
  }

  async function checkout() {
    if (!user) { closeCart(); router.push("/login"); return; }
    setPlacing(true); setMsg(null); setPendingCheckoutId(null);
    const orderTotal = total;
    try {
      const order = await api.createOrder({
        items: lines.map(([listingId, qty]) => ({ listingId, qty })),
        phoneNumber: phone,
        deliveryAddress: address,
        prescriptionImage: rxImage ?? undefined,
      });
      clear(); setRxImage(null); setRxName("");
      onOrdered?.();
      if (order.redirect) {
        // jenga_pgw: hand the browser off to Jenga's hosted checkout.
        const form = document.createElement("form");
        form.method = "POST";
        form.action = order.redirect.actionUrl;
        for (const [name, value] of Object.entries(order.redirect.fields)) {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = name; input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      if (!IS_TILL_MODE) setMsg({ kind: "ok", text: "Order placed — check your phone for the M-Pesa prompt." });
      setPendingCheckoutId(order.payment?.gatewayRef ?? null);
      setPendingAmount(orderTotal);
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Checkout failed" });
    } finally {
      setPlacing(false);
    }
  }

  async function simulate() {
    if (!pendingCheckoutId) return;
    setSimulating(true);
    try {
      await api.simulateMpesaPayment(pendingCheckoutId);
      setMsg({ kind: "ok", text: "Payment received ✓ — your order is paid." });
      setPendingCheckoutId(null);
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Simulation failed" });
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div>
      {lines.length === 0 && Object.keys(items).length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Your cart is empty. Add products to get started.</p>
      ) : (
        <>
          <ul className="mt-1 space-y-3">
            {lines.map(([id, q]) => {
              const l = catalog[id]!;
              return (
                <li key={id} className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {l.drug.imageUrl && <img src={l.drug.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{l.drug.name}</div>
                    <div className="text-xs text-slate-400">{kes(l.priceKes)} each · {l.organization.name}</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 text-sm">
                    <button onClick={() => sub(id)} className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100">−</button>
                    <span className="w-5 text-center font-semibold">{q}</span>
                    <button onClick={() => add(id)} className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100">+</button>
                  </div>
                  <button onClick={() => remove(id)} className="text-slate-300 hover:text-rose-500" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-slate-500">Total</span>
            <span className="text-xl font-extrabold text-teal-700">{kes(total)}</span>
          </div>

          {hasRx && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                <AlertCircle className="h-4 w-4" /> Prescription required
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Your cart has prescription-only medication. Upload a prescription or book a consultation to continue.
              </p>
              {rxImage ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-emerald-700">
                  <FileCheck2 className="h-4 w-4" /> <span className="truncate">{rxName}</span>
                  <button onClick={() => { setRxImage(null); setRxName(""); }} className="ml-auto text-xs text-slate-400 hover:text-rose-500">Remove</button>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
                    <Upload className="h-4 w-4" /> Upload
                  </button>
                  <Link href="/providers" onClick={closeCart} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                    <Stethoscope className="h-4 w-4" /> Consult
                  </Link>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onUpload} className="hidden" />
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="M-Pesa phone (07…)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            <button onClick={checkout} disabled={placing || address.length < 5 || !rxSatisfied}
              className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-50">
              {placing ? "Placing order…" : !rxSatisfied ? "Add prescription to continue" : `Pay ${kes(total)} via M-Pesa`}
            </button>
            <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure M-Pesa checkout
            </p>
          </div>
        </>
      )}

      {msg && (
        <div className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {msg.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {pendingCheckoutId && IS_TILL_MODE && (
        <div className="mt-4">
          <TillPayBox
            gatewayRef={pendingCheckoutId}
            amountKes={pendingAmount}
            noun="order"
            onSubmitted={() => onOrdered?.()}
          />
        </div>
      )}

      {pendingCheckoutId && !IS_TILL_MODE && (
        <button
          onClick={simulate}
          disabled={simulating}
          className="mt-3 w-full rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
        >
          {simulating ? "Completing…" : "Simulate M-Pesa payment (sandbox)"}
        </button>
      )}
    </div>
  );
}

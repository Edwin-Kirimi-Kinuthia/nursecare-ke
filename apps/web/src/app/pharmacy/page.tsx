"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag, Trash2, CheckCircle2, AlertCircle, ShieldCheck, Upload, Stethoscope, FileCheck2 } from "lucide-react";
import type { Product } from "@carebora/api-client";
import { ApiError } from "@carebora/shared";
import { api, kes } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";

export default function PharmacyPage() {
  const { user } = useAuth();
  const { items, count, sub, add, remove, clear } = useCart();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("0712345678");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [rxName, setRxName] = useState<string>("");
  const [selected, setSelected] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.listProducts({ limit: 50 });
        if (active) setProducts(res.products);
      } catch {
        if (active) setMsg({ kind: "err", text: "Could not load products." });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ["", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const shown = category ? products.filter((p) => p.category === category) : products;

  const lines = Object.entries(items).filter(([id]) => byId.has(id));
  const total = lines.reduce((sum, [id, q]) => sum + (byId.get(id)?.priceKes ?? 0) * q, 0);
  const hasRx = lines.some(([id]) => byId.get(id)?.requiresPrescription);
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
    if (!user) { router.push("/login"); return; }
    setPlacing(true);
    setMsg(null);
    try {
      await api.createOrder({
        items: lines.map(([productId, qty]) => ({ productId, qty })),
        phoneNumber: phone,
        deliveryAddress: address,
        prescriptionImage: rxImage ?? undefined,
      });
      setMsg({ kind: "ok", text: "Order placed — check your phone for the M-Pesa prompt." });
      clear();
      setRxImage(null); setRxName("");
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof ApiError ? err.message : "Checkout failed" });
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Pharmacy</h1>
          <p className="mt-2 text-slate-500">Medication and supplies, delivered across Kenya.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === c
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-500/30"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                {c || "All"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Catalogue */}
          <div>
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl skeleton" />)}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((p) => <ProductCard key={p.id} p={p} onOpen={() => setSelected(p)} />)}
              </div>
            )}
          </div>

          {/* Cart */}
          <aside className="h-fit lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-teal-600" />
                <h2 className="font-bold text-slate-900">Your cart</h2>
                {count > 0 && <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">{count}</span>}
              </div>

              {lines.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">Your cart is empty. Add products to get started.</p>
              ) : (
                <>
                  <ul className="mt-4 space-y-3">
                    {lines.map(([id, q]) => {
                      const p = byId.get(id)!;
                      return (
                        <li key={id} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-400">{kes(p.priceKes)} each</div>
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

                  {/* Prescription gate for Rx items */}
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
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            <Upload className="h-4 w-4" /> Upload
                          </button>
                          <Link
                            href="/providers"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                          >
                            <Stethoscope className="h-4 w-4" /> Consult
                          </Link>
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={onUpload} className="hidden" />
                    </div>
                  )}

                  <div className="mt-4 space-y-2.5">
                    <input
                      value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="M-Pesa phone (07…)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                    <textarea
                      value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" rows={2}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                    <button
                      onClick={checkout}
                      disabled={placing || address.length < 5 || !rxSatisfied}
                      className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-50"
                    >
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
            </div>
          </aside>
        </div>
      </section>

      {selected && <ProductDetailModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

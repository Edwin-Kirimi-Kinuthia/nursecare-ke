"use client";

import { useEffect } from "react";
import { X, Plus, Minus, ShieldAlert, Check, PackageCheck, PackageX } from "lucide-react";
import type { Product } from "@carebora/api-client";
import { kes } from "@/lib/api";
import { categoryTheme } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";

export default function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { items, add, sub } = useCart();
  const qty = items[product.id] ?? 0;
  const { Icon, from, to } = categoryTheme(product.category);
  const outOfStock = product.stockQty === 0;
  const lowStock = product.stockQty > 0 && product.stockQty < 20;

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-slate-50 sm:aspect-auto">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className={`grid h-full min-h-[240px] place-items-center bg-gradient-to-br ${from} ${to}`}>
                <Icon className="h-24 w-24 text-white/90 drop-shadow" strokeWidth={1.25} />
              </div>
            )}
            <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur ${
              product.requiresPrescription ? "bg-white/95 text-violet-700" : "bg-white/90 text-emerald-700"
            }`}>
              {product.requiresPrescription ? "Prescription (Rx)" : "Over the counter"}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-col p-6">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{product.category}</div>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">{product.name}</h2>
            {product.genericName && (
              <p className="mt-0.5 text-sm text-slate-500">Generic: <span className="font-medium text-slate-700">{product.genericName}</span></p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-extrabold text-teal-700">{kes(product.priceKes)}</span>
              {outOfStock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"><PackageX className="h-3.5 w-3.5" /> Out of stock</span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"><PackageCheck className="h-3.5 w-3.5" /> Only {product.stockQty} left</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"><PackageCheck className="h-3.5 w-3.5" /> In stock</span>
              )}
            </div>

            {product.description && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{product.description}</p>
              </div>
            )}

            {product.requiresPrescription && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>This medicine requires a valid prescription. You&apos;ll be asked to attach one (or link an in-app prescription) at checkout.</span>
              </div>
            )}

            <div className="mt-auto pt-6">
              {qty > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
                    <button onClick={() => sub(product.id)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Remove one"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-sm font-bold">{qty}</span>
                    <button onClick={() => add(product.id)} disabled={outOfStock} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Add one"><Plus className="h-4 w-4" /></button>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700"><Check className="h-4 w-4" /> In your cart</span>
                </div>
              ) : (
                <button
                  onClick={() => add(product.id)}
                  disabled={outOfStock}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Plus className="h-5 w-5" /> {outOfStock ? "Out of stock" : "Add to cart"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

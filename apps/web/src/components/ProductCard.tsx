"use client";

import { Plus, Minus, Check } from "lucide-react";
import type { Product } from "@carebora/api-client";
import { kes } from "@/lib/api";
import { categoryTheme } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";

export default function ProductCard({ p }: { p: Product }) {
  const { items, add, sub } = useCart();
  const qty = items[p.id] ?? 0;
  const { Icon, from, to } = categoryTheme(p.category);

  return (
    <div className="card-lift flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* "Image" header — themed by category */}
      <div className={`relative grid h-32 place-items-center bg-gradient-to-br ${from} ${to}`}>
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_70%_20%,white,transparent_45%)]" />
        <Icon className="h-12 w-12 text-white/90 drop-shadow" strokeWidth={1.5} />
        {p.requiresPrescription && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-amber-700 shadow-sm">
            Rx
          </span>
        )}
        {qty > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-teal-700 shadow-sm">
            <Check className="h-3 w-3" /> {qty}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{p.category}</div>
        <h3 className="mt-0.5 font-bold leading-snug text-slate-900">{p.name}</h3>
        {p.description && <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{p.description}</p>}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-extrabold text-teal-700">{kes(p.priceKes)}</span>
          {qty > 0 ? (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-0.5">
              <button onClick={() => sub(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Remove one">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => add(p.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Add one">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => add(p.id)}
              className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

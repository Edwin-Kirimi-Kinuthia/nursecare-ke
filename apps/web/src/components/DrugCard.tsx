"use client";

import { Plus, Minus, Check, MapPin } from "lucide-react";
import type { StorefrontDrug } from "@carebora/api-client";
import { kes } from "@/lib/api";
import { categoryTheme } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";

export default function DrugCard({ d, onOpen }: { d: StorefrontDrug; onOpen?: () => void }) {
  const { items, add, sub } = useCart();
  const qty = items[d.listingId] ?? 0;
  const { Icon, from, to } = categoryTheme(d.category);
  const lowStock = d.stockQty > 0 && d.stockQty < 20;
  const outOfStock = d.stockQty === 0;

  return (
    <div className="group card-lift flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60">
      {/* Image — zooms on hover; opens details */}
      <div
        onClick={onOpen}
        role={onOpen ? "button" : undefined}
        aria-label={onOpen ? `View ${d.name} details` : undefined}
        className={`relative aspect-[5/4] overflow-hidden bg-white ${onOpen ? "cursor-pointer" : ""}`}
      >
        {d.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.imageUrl}
            alt={d.name}
            className="h-full w-full bg-white object-contain p-2 transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.06]"
          />
        ) : (
          <div className={`grid h-full place-items-center bg-gradient-to-br ${from} ${to} transition-transform duration-500 ease-out group-hover:scale-[1.12]`}>
            <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_70%_20%,white,transparent_45%)]" />
            <Icon className="h-14 w-14 text-white/90 drop-shadow" strokeWidth={1.5} />
          </div>
        )}

        {/* Subtle gradient veil for badge legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/5 to-transparent" />

        {d.requiresPrescription ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-violet-700 shadow-sm backdrop-blur">
            Rx
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
            OTC
          </span>
        )}
        {qty > 0 && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
            <Check className="h-3 w-3" /> {qty}
          </span>
        )}
        {outOfStock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-rose-600/95 px-2.5 py-0.5 text-xs font-bold text-white shadow">
            Out of stock
          </span>
        )}
        {lowStock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-amber-500/95 px-2.5 py-0.5 text-xs font-bold text-white shadow">
            Only {d.stockQty} left
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div
          onClick={onOpen}
          role={onOpen ? "button" : undefined}
          className={onOpen ? "cursor-pointer" : undefined}
        >
          <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400" title={d.category}>{d.category}</div>
          <h3 className="mt-0.5 line-clamp-2 break-words font-bold leading-snug text-slate-900 group-hover:text-teal-700">{d.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            {d.nearestVendor.orgName}
            {d.nearestVendor.distanceKm != null ? ` · ${d.nearestVendor.distanceKm.toFixed(1)}km` : ` · ${d.nearestVendor.county}`}
            {d.vendorCount > 1 && ` · +${d.vendorCount - 1} more`}
          </p>
        </div>

        <div className="mt-4 flex flex-1 items-end justify-between">
          <span className="text-lg font-extrabold text-teal-700">{kes(d.bestPriceKes)}</span>
          {qty > 0 ? (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-0.5">
              <button onClick={() => sub(d.listingId)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Remove one">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{qty}</span>
              <button onClick={() => add(d.listingId)} disabled={outOfStock} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Add one">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => add(d.listingId)}
              disabled={outOfStock}
              className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

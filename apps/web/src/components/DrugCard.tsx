"use client";

import { Plus, Minus, Check, MapPin, Eye, ShoppingCart } from "lucide-react";
import type { StorefrontDrug } from "@carebora/api-client";
import { kes } from "@/lib/api";
import { categoryTheme } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";

/**
 * A pharmacy product card. Photos, pricing, and stock share the same neutral
 * layout. Styles live in globals.css (.pcard).
 */
export default function DrugCard({ d, onOpen, index = 0 }: { d: StorefrontDrug; onOpen?: () => void; index?: number }) {
  const { items, add, sub } = useCart();
  const qty = items[d.listingId] ?? 0;
  const { Icon } = categoryTheme(d.category);
  const lowStock = d.stockQty > 0 && d.stockQty < 20;
  const outOfStock = d.stockQty === 0;

  return (
    <article className="pcard" data-tone={index % 4}>
      <button type="button" className="pcard__img w-full text-left" onClick={onOpen} disabled={!onOpen} aria-label={`View ${d.name} details`}>
        {d.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.imageUrl} alt={d.name} loading="lazy" />
        ) : (
          <span className="pcard__tile bg-slate-50">
            <Icon className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
          </span>
        )}
        <span className="pcard__chip" style={{ left: ".6rem", top: ".6rem", color: d.requiresPrescription ? "#6d28d9" : "#047857" }}>
          {d.requiresPrescription ? "Rx" : "OTC"}
        </span>
        {qty > 0 && (
          <span className="pcard__chip inline-flex items-center gap-1" style={{ right: ".6rem", top: ".6rem", background: "#2f6638", color: "#fff" }}>
            <Check className="h-3 w-3" /> {qty} in cart
          </span>
        )}
        {outOfStock && <span className="pcard__chip" style={{ left: ".6rem", bottom: ".6rem", background: "#e11d48", color: "#fff" }}>Out of stock</span>}
        {lowStock && <span className="pcard__chip" style={{ left: ".6rem", bottom: ".6rem", background: "#f59e0b", color: "#fff" }}>Only {d.stockQty} left</span>}
        {onOpen && <span className="pcard__view" aria-hidden><Eye className="h-4 w-4" /></span>}
      </button>

      <div className="pcard__body">
        <div className="pcard__cat" title={d.category}>{d.category}</div>
        <h3 className="pcard__title">{onOpen ? <button type="button" onClick={onOpen} className="text-left hover:underline">{d.name}</button> : d.name}</h3>
        <p className="pcard__meta">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {d.nearestVendor.orgName}
            {d.nearestVendor.distanceKm != null ? ` · ${d.nearestVendor.distanceKm.toFixed(1)}km` : ` · ${d.nearestVendor.county}`}
            {d.vendorCount > 1 && ` · +${d.vendorCount - 1} more`}
          </span>
        </p>
        <div className={`pcard__stock ${lowStock || outOfStock ? "is-low" : ""}`}>
          {outOfStock ? "Out of stock" : lowStock ? `Only ${d.stockQty} left` : "In stock"}
        </div>
      </div>

      <div className="pcard__foot">
        <span className="pcard__price">{kes(d.bestPriceKes)}</span>
        {qty > 0 ? (
          <span className="pcard__qty">
            <button type="button" onClick={() => sub(d.listingId)} aria-label={`Remove one ${d.name}`}><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center text-sm font-bold">{qty}</span>
            <button type="button" onClick={() => add(d.listingId)} disabled={outOfStock} aria-label={`Add one ${d.name}`}><Plus className="h-4 w-4" /></button>
          </span>
        ) : (
          <button type="button" className="pcard__add" onClick={() => add(d.listingId)} disabled={outOfStock} aria-label={`Add ${d.name} to cart`}>
            <ShoppingCart className="h-4 w-4" /> Add
          </button>
        )}
      </div>
    </article>
  );
}

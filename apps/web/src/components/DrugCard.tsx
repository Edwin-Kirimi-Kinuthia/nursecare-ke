"use client";

import { Plus, Minus, Check, MapPin, Eye, ShoppingCart } from "lucide-react";
import type { StorefrontDrug } from "@carebora/api-client";
import { kes } from "@/lib/api";
import { categoryTheme } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";

/**
 * A pharmacy product card, in the pastel-tile style from the owner's earlier
 * shop: `index` picks one of four background colours so a grid reads as a
 * patchwork rather than a wall of white. Styles live in globals.css (.pcard).
 */
export default function DrugCard({ d, onOpen, index = 0 }: { d: StorefrontDrug; onOpen?: () => void; index?: number }) {
  const { items, add, sub } = useCart();
  const qty = items[d.listingId] ?? 0;
  const { Icon, from, to } = categoryTheme(d.category);
  const lowStock = d.stockQty > 0 && d.stockQty < 20;
  const outOfStock = d.stockQty === 0;

  return (
    <article className="pcard" data-tone={index % 4}>
      <span className="pcard__chip" style={{ left: "0.75rem", top: "0.75rem", color: d.requiresPrescription ? "#6d28d9" : "#047857" }}>
        {d.requiresPrescription ? "Rx" : "OTC"}
      </span>
      {qty > 0 && (
        <span className="pcard__chip inline-flex items-center gap-1" style={{ right: "0.75rem", top: "0.75rem", background: "#0d9488", color: "#fff" }}>
          <Check className="h-3 w-3" /> {qty}
        </span>
      )}

      <div className="pcard__name" aria-hidden>{d.name}</div>

      <div
        className="pcard__img"
        onClick={onOpen}
        role={onOpen ? "button" : undefined}
        aria-label={onOpen ? `View ${d.name} details` : undefined}
      >
        {d.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.imageUrl} alt={d.name} loading="lazy" />
        ) : (
          <div className={`pcard__tile bg-gradient-to-br ${from} ${to}`}>
            <Icon className="h-14 w-14 text-white/90 drop-shadow" strokeWidth={1.5} />
          </div>
        )}
        {outOfStock && <span className="pcard__chip" style={{ left: "0.75rem", bottom: "0.75rem", background: "#e11d48", color: "#fff" }}>Out of stock</span>}
        {lowStock && <span className="pcard__chip" style={{ left: "0.75rem", bottom: "0.75rem", background: "#f59e0b", color: "#fff" }}>Only {d.stockQty} left</span>}
      </div>

      <div className="pcard__body" onClick={onOpen} role={onOpen ? "button" : undefined} style={{ cursor: onOpen ? "pointer" : undefined }}>
        <div className="pcard__cat" title={d.category}>{d.category}</div>
        <h3 className="pcard__title">{d.name}</h3>
        <p className="pcard__meta">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {d.nearestVendor.orgName}
            {d.nearestVendor.distanceKm != null ? ` · ${d.nearestVendor.distanceKm.toFixed(1)}km` : ` · ${d.nearestVendor.county}`}
            {d.vendorCount > 1 && ` · +${d.vendorCount - 1} more`}
          </span>
        </p>
        <div className={`pcard__stock ${lowStock || outOfStock ? "is-low" : ""}`}>
          {outOfStock ? "Out of stock" : lowStock ? `Low stock: ${d.stockQty} left` : "In stock"}
        </div>
      </div>

      <div className="pcard__price">{kes(d.bestPriceKes)}</div>

      <div className="pcard__actions">
        <button type="button" className="pcard__btn" onClick={onOpen} title="View details" aria-label={`View ${d.name} details`}>
          <Eye className="h-5 w-5" />
        </button>
        {qty > 0 ? (
          <div className="flex items-center gap-1 rounded-full bg-white px-1 py-0.5">
            <button type="button" className="pcard__btn !h-8 !w-8" onClick={() => sub(d.listingId)} aria-label="Remove one"><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center text-sm font-bold">{qty}</span>
            <button type="button" className="pcard__btn !h-8 !w-8" onClick={() => add(d.listingId)} disabled={outOfStock} aria-label="Add one"><Plus className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" className="pcard__btn" onClick={() => add(d.listingId)} disabled={outOfStock} title="Add to cart" aria-label={`Add ${d.name} to cart`}>
            <ShoppingCart className="h-5 w-5" />
          </button>
        )}
      </div>
    </article>
  );
}

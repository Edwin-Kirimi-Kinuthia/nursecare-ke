"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus, ShieldAlert, Check, MapPin, Loader2, ZoomIn } from "lucide-react";
import type { Drug, DrugOffer } from "@carebora/api-client";
import { api, kes } from "@/lib/api";
import { categoryTheme } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";
import { productPhotoCredit } from "@carebora/shared";
import { useLocation } from "@/components/LocationProvider";

export default function DrugDetailModal({ drugId, onClose }: { drugId: string; onClose: () => void }) {
  const { items, add, sub } = useCart();
  const { lat, lng } = useLocation();
  const [drug, setDrug] = useState<Drug | null>(null);
  const [offers, setOffers] = useState<DrugOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setLoading(true); });
    Promise.all([
      api.getDrug(drugId),
      api.getDrugOffers(drugId, lat != null && lng != null ? { lat, lng } : {}),
    ]).then(([d, o]) => {
      if (!active) return;
      setDrug(d);
      setOffers(o.offers);
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [drugId, lat, lng]);

  // Gallery + Amazon-style hover zoom (magnifies where the cursor points).
  const gallery = drug?.images?.length ? drug.images : drug?.imageUrl ? [drug.imageUrl] : [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { Icon, from, to } = categoryTheme(drug?.category ?? "");

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

        {loading || !drug ? (
          <div className="grid h-96 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
        ) : (
          <div className="grid sm:grid-cols-2">
            {/* Image gallery with hover-zoom */}
            <div className="p-4 sm:p-5">
              <div
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-white"
                onMouseEnter={() => gallery.length && setZoom(true)}
                onMouseLeave={() => setZoom(false)}
                onMouseMove={onMove}
              >
                {gallery.length ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gallery[active]}
                    alt={drug.name}
                    className="h-full w-full cursor-zoom-in bg-white object-contain p-3 transition-transform duration-150 ease-out"
                    style={{ transformOrigin: origin, transform: zoom ? "scale(2.4)" : "scale(1)" }}
                  />
                ) : (
                  <div className={`grid h-full place-items-center bg-gradient-to-br ${from} ${to}`}>
                    <Icon className="h-24 w-24 text-white/90 drop-shadow" strokeWidth={1.25} />
                  </div>
                )}
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur ${
                  drug.requiresPrescription ? "bg-white/95 text-violet-700" : "bg-white/90 text-emerald-700"
                }`}>
                  {drug.requiresPrescription ? "Prescription (Rx)" : "Over the counter"}
                </span>
                {gallery.length > 0 && (
                  <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                    <ZoomIn className="h-3 w-3" /> Hover to zoom
                  </span>
                )}
              </div>

              {gallery.length > 0 && <p className="mt-2 text-center text-[11px] text-slate-400">Image for illustration. The pack you receive may look different.</p>}
              {(() => {
                const c = productPhotoCredit(gallery[active]);
                return c ? (
                  <p className="mt-0.5 text-center text-[11px] text-slate-400">
                    Photo: <a href={c.source} target="_blank" rel="noopener noreferrer" className="hover:text-teal-700 hover:underline">{c.author}</a>, {c.license}
                  </p>
                ) : null;
              })()}

              {gallery.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {gallery.map((src, i) => (
                    <button
                      key={i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? "border-teal-500" : "border-transparent hover:border-slate-300"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full bg-white object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details + vendor offers */}
            <div className="flex flex-col p-6">
              <div className="break-words text-[11px] font-semibold uppercase tracking-wide text-slate-400">{drug.category}</div>
              <h2 className="mt-1 break-words text-2xl font-extrabold leading-tight text-slate-900">{drug.name}</h2>
              {drug.genericName && (
                <p className="mt-0.5 text-sm text-slate-500">Generic: <span className="font-medium text-slate-700">{drug.genericName}</span></p>
              )}
              {drug.strength && <p className="mt-0.5 text-sm text-slate-500">{drug.form ? `${drug.form} · ` : ""}{drug.strength}</p>}

              {drug.description && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{drug.description}</p>
                </div>
              )}

              {drug.requiresPrescription && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>This medicine requires a valid prescription. You&apos;ll be asked to attach one (or link an in-app prescription) at checkout.</span>
                </div>
              )}

              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {offers.length} pharmac{offers.length === 1 ? "y" : "ies"} selling this
                </h3>
                <div className="mt-2 space-y-2">
                  {offers.map((o) => {
                    const qty = items[o.listingId] ?? 0;
                    const outOfStock = o.stockQty === 0;
                    return (
                      <div key={o.listingId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">{o.orgName}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            {o.branchName} · {o.distanceKm != null ? `${o.distanceKm.toFixed(1)}km` : o.county}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-bold text-teal-700">{kes(o.priceKes)}</span>
                          {qty > 0 ? (
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
                              <button onClick={() => sub(o.listingId)} className="grid h-7 w-7 place-items-center rounded text-slate-600 hover:bg-slate-100" aria-label="Remove one"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-5 text-center text-xs font-bold">{qty}</span>
                              <button onClick={() => add(o.listingId)} disabled={outOfStock} className="grid h-7 w-7 place-items-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Add one"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => add(o.listingId)}
                              disabled={outOfStock}
                              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {outOfStock ? "Out of stock" : <><Plus className="h-3.5 w-3.5" /> Add</>}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {offers.some((o) => (items[o.listingId] ?? 0) > 0) && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-teal-700"><Check className="h-3.5 w-3.5" /> In your cart</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

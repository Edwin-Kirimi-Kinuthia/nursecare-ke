"use client";
import OrganizationReviews from "@/components/OrganizationReviews";
import { medicineUnit } from "@carebora/shared";
import type { DrugOffer } from "@carebora/api-client";
import { useCart } from "@/components/CartProvider";
import { kes } from "@/lib/api";
export default function DrugOffers({ offers, form }: { offers: DrugOffer[]; form?: string | null }) {
  const { add } = useCart();
  if (!offers.length) return <p className="mt-4 text-slate-600">No pharmacy offers are available right now. Check back for availability.</p>;
  return <div className="mt-4 space-y-3">{offers.map(o => <div key={`${o.listingId}-${o.branchName}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div><h3 className="font-semibold">{o.orgName}</h3><OrganizationReviews orgId={o.orgId} name={o.orgName} /><p className="text-sm text-slate-600">{o.branchName} · {o.county}</p><p className="mt-2">{kes(o.priceKes)} / {medicineUnit(form)}</p><p className="text-sm text-slate-500">Minimum order: {o.minOrderQty ?? 1} units · {kes(o.priceKes * (o.minOrderQty ?? 1))}</p></div><button className="button-primary" onClick={() => add(o.listingId, o.minOrderQty ?? 1, Math.min(100, o.stockQty))}>Add to cart</button></div>)}</div>;
}

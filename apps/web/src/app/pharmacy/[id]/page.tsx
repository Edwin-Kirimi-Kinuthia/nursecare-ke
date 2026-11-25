import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { drugService, storefrontService } from "@carebora/core";
import { ApiError, medicineUnit } from "@carebora/shared";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/structured-data";
import DrugOffers from "@/components/DrugOffers";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
const getDrug = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  try { return await drugService.getPublicById(id); }
  catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
});
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await getDrug((await params).id);
  const title = `${d.name}${d.strength ? ` ${d.strength}` : ""} | Pharmacy Kenya`;
  const description = d.description?.slice(0, 160) || `View ${d.name}${d.genericName ? ` (${d.genericName})` : ""}, ${d.category}, and compare pharmacy offers in Kenya.${d.requiresPrescription ? " A valid prescription is required." : ""}`;
  const images = d.imageUrl ? [{ url: d.imageUrl.startsWith("/") ? absoluteUrl(d.imageUrl) : d.imageUrl, alt: d.name }] : [];
  return { title, description, alternates: { canonical: `/pharmacy/${d.id}` }, openGraph: { title, description, url: `/pharmacy/${d.id}`, type: "website", images }, twitter: { card: "summary_large_image", title, description, images } };
}
export default async function DrugPage({ params }: Props) {
  const d = await getDrug((await params).id);
  const { offers } = await storefrontService.getOffers(d.id, {});
  const trail: [string,string][] = [["Home", "/"], ["Pharmacy", "/pharmacy"], [d.name, `/pharmacy/${d.id}`]];
  return <article className="mx-auto max-w-5xl px-4 py-10">
    <JsonLd data={{ "@context": "https://schema.org", "@type": ["Drug", "Product"], "@id": absoluteUrl(`/pharmacy/${d.id}#medicine`), sku: d.id, image: d.imageUrl ? (d.imageUrl.startsWith("/") ? absoluteUrl(d.imageUrl) : d.imageUrl) : undefined, offers: offers.length ? offers.map(o => ({ "@type": "Offer", url: absoluteUrl(`/pharmacy/${d.id}`), price: o.priceKes, priceCurrency: "KES", availability: "https://schema.org/InStock", seller: { "@type": "Pharmacy", name: o.orgName }, eligibleQuantity: { "@type": "QuantitativeValue", minValue: o.minOrderQty, maxValue: o.stockQty, unitText: medicineUnit(d.form) }, priceSpecification: { "@type": "UnitPriceSpecification", price: o.priceKes, priceCurrency: "KES", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText: medicineUnit(d.form) } } })) : undefined, name: d.name, description: d.description ?? undefined, nonProprietaryName: d.genericName ?? undefined, dosageForm: d.form ?? undefined, activeIngredient: d.genericName ?? undefined, prescriptionStatus: d.requiresPrescription ? "https://schema.org/PrescriptionOnly" : "https://schema.org/OTC", url: absoluteUrl(`/pharmacy/${d.id}`) }} />
    <JsonLd data={breadcrumbSchema(trail)} />
    <Breadcrumbs trail={trail} />
    <div className="grid gap-8 sm:grid-cols-2"><div>
      {d.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.imageUrl} alt={d.name} width={640} height={640} fetchPriority="high" decoding="async" className="aspect-square w-full rounded-2xl border border-slate-200 object-contain" />)}
    </div><div><p className="text-sm font-medium text-teal-700">{d.category}</p><h1 className="mt-3 text-3xl font-semibold">{d.name}</h1>
      <dl className="mt-5 space-y-2">{[["Generic name", d.genericName], ["Strength", d.strength], ["Form", d.form]].map(([label, value]) => value && <div key={label}><dt className="inline font-semibold">{label}: </dt><dd className="inline">{value}</dd></div>)}</dl>
      {d.description && <p className="mt-5 whitespace-pre-line text-slate-600">{d.description}</p>}
      <p className="mt-5 rounded-xl bg-teal-50 p-4">{d.requiresPrescription ? "Prescription only. A valid prescription is required before this medicine can be dispensed." : "Follow the package instructions and ask a pharmacist if you are unsure whether this medicine is suitable for you."}</p>
      <p className="mt-4 text-sm text-slate-500">Consult a qualified clinician or pharmacist about suitability, dosage and interactions.</p>
    </div></div>
    <section className="mt-10"><h2 className="text-2xl font-semibold">Pharmacy offers</h2><DrugOffers offers={offers} form={d.form} /></section>
  </article>;
}

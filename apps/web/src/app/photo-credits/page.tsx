import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { CARE_IMAGES } from "@/lib/care-imagery";

export const metadata: Metadata = {
  title: "Photography credits",
  description: "The photographers behind the illustrative care photographs on Care Bora.",
  alternates: { canonical: "/photo-credits" },
};

export default function PhotoCreditsPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">← Back to Care Bora</Link>
      <PageHeader className="mt-6" eyebrow="Photography" title="The people behind the pictures" lede="Our service photographs illustrate healthcare settings. The people pictured are not presented as Care Bora staff, registered providers, or patients. Provider profiles use photos supplied for those profiles." />
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {Object.entries(CARE_IMAGES).map(([key, photo]) => (
          <figure key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="service-photo aspect-[4/3]"><Image src={photo.src} alt={photo.alt} fill placeholder="blur" sizes="(min-width: 640px) 420px, 92vw" className={key === "portrait" ? "object-top" : "object-[center_40%]"} /></div>
            <figcaption className="p-5 text-sm leading-relaxed text-slate-600">
              <a href={photo.credit.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 underline underline-offset-4">{photo.credit.author}</a>
              <p className="mt-2">{photo.credit.license}. Displayed with responsive crops.</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-8 text-sm leading-relaxed text-slate-600">License details: <a href="https://www.pexels.com/license/" className="text-teal-700 underline underline-offset-4">Pexels License</a> and <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="text-teal-700 underline underline-offset-4">Creative Commons Attribution-ShareAlike 4.0</a>. No endorsement by the people pictured is implied.</p>
    </article>
  );
}

import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { ArrowRight, Phone, AlertTriangle } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";
import { breadcrumbSchema, faqSchema, serviceSchema, type Faq } from "@/lib/structured-data";

export interface ServicePageProps {
  path: string;
  /** Name used in the Service markup and the breadcrumb. */
  name: string;
  eyebrow: string;
  h1: string;
  intro: string;
  schemaDescription: string;
  cta: { label: string; href: string };
  stepsHeading: string;
  steps: { title: string; body: string }[];
  sections: { heading: string; paragraphs?: string[]; bullets?: string[] }[];
  /** Shown prominently: when this isn't the right service for you. */
  safety?: { title: string; body: string };
  faqs: Faq[];
  /** A photo shown under the introduction. */
  image?: { src: StaticImageData; alt: string; credit?: { author: string; license: string; source: string } };
  /** Or a flat illustration (public path), shown on a pastel panel. */
  illustration?: { src: string; alt: string };
  related: { label: string; href: string; blurb: string }[];
  /** ISO date the content was last checked. Shown to readers and used by the sitemap. */
  updated: string;
}

/**
 * Template for a service landing page.
 *
 * These pages exist so people searching for what Care Bora actually does — "see
 * a doctor online in Kenya", "sick-off sheet online" — land on a page that
 * answers the question rather than on a login screen. Each one is written for a
 * reader first: what the service is, exactly how it works here, who it isn't
 * for, and honest answers. A page that only repeats keywords to rank would be
 * the thin, near-duplicate content search engines demote, so the template gives
 * structure and the pages supply substance.
 */
export default function ServicePage(p: ServicePageProps) {
  const trail: [string, string][] = [["Home", "/"], [p.name, p.path]];
  const updatedLabel = new Date(p.updated).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={serviceSchema({ name: p.name, description: p.schemaDescription, path: p.path })} />
      <JsonLd data={faqSchema(p.faqs, p.path)} />
      <JsonLd data={breadcrumbSchema(trail)} />

      <Breadcrumbs trail={trail} />

      <header>
        <p className="text-sm font-semibold text-teal-600">{p.eyebrow}</p>
        <h1 className="mt-1.5 text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{p.h1}</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{p.intro}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={p.cta.href} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700">
            {p.cta.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Written by the Care Bora team · Last checked {updatedLabel}. This page describes how our service works and is not medical advice.
        </p>
        {p.illustration && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50 via-white to-emerald-100 ring-1 ring-slate-200/70">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-teal-200/50 blur-2xl" />
            <div className="absolute -bottom-12 -left-8 h-52 w-52 rounded-full bg-rose-200/40 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.illustration.src} alt={p.illustration.alt} className="absolute inset-0 h-full w-full object-contain p-6 sm:p-10" />
          </div>
        )}
        {p.image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10">
            <Image src={p.image.src} alt={p.image.alt} fill placeholder="blur" fetchPriority="high" loading="eager" sizes="(min-width: 768px) 736px, 92vw" className="object-cover" />
          </div>
        )}
        {p.image?.credit && (
          <p className="mt-2 text-right text-[11px] text-slate-400">
            Photo: <a href={p.image.credit.source} target="_blank" rel="noopener noreferrer" className="hover:text-teal-700 hover:underline">{p.image.credit.author}</a>, {p.image.credit.license}
          </p>
        )}
      </header>

      <section className="mt-12" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-extrabold tracking-tight text-slate-900">{p.stepsHeading}</h2>
        <ol className="mt-5 space-y-4">
          {p.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-600 text-sm font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 leading-relaxed text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {p.sections.map((s) => (
        <section key={s.heading} className="mt-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{s.heading}</h2>
          {s.paragraphs?.map((t) => <p key={t.slice(0, 32)} className="mt-4 leading-relaxed text-slate-600">{t}</p>)}
          {s.bullets && (
            <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-teal-600">
              {s.bullets.map((b) => <li key={b.slice(0, 32)}>{b}</li>)}
            </ul>
          )}
        </section>
      ))}

      {p.safety && (
        <aside className="mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-5" aria-label="When not to use this service">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rose-900">
            <AlertTriangle className="h-5 w-5" aria-hidden /> {p.safety.title}
          </h2>
          <p className="mt-2 leading-relaxed text-rose-800">{p.safety.body}</p>
          <a href={`tel:${AMBULANCE_PHONE}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700">
            <Phone className="h-4 w-4" aria-hidden /> Call {AMBULANCE_PHONE_DISPLAY}
          </a>
        </aside>
      )}

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-extrabold tracking-tight text-slate-900">Questions people ask</h2>
        <FaqList faqs={p.faqs} className="mt-5" />
      </section>

      <section className="mt-12" aria-labelledby="more">
        <h2 id="more" className="text-xl font-extrabold tracking-tight text-slate-900">Related</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {p.related.map((r) => (
            <Link key={r.href} href={r.href} className="card-lift rounded-2xl border border-slate-200 bg-white p-4">
              <span className="font-bold text-slate-900">{r.label}</span>
              <span className="mt-1 block text-sm text-slate-500">{r.blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}

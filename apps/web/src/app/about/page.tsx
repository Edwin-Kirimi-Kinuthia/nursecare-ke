import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/structured-data";
import { SITE_FACTS } from "@/lib/site-facts";
import {
  SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY,
} from "@/lib/contact";

const PATH = "/about";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Care Bora is a Kenyan telehealth platform based in Nairobi. Who we are, what we do, how providers are checked, and how to reach us.",
  alternates: { canonical: PATH },
  openGraph: { title: "About Care Bora Kenya", url: PATH, type: "website" },
};

export default function AboutPage() {
  const trail: [string, string][] = [["Home", "/"], ["About", PATH]];
  const f = SITE_FACTS;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <header>
        <p className="text-sm font-semibold text-teal-600">About us</p>
        <h1 className="mt-1.5 text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">About Care Bora Kenya</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Care Bora is a Kenyan telehealth platform based in Nairobi. We connect people with clinicians whose practice licences we have checked,
          so that seeing a doctor, getting a sick-off sheet or arranging a home visit takes a few minutes on a phone instead of a day of travel
          and waiting.
        </p>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50 via-white to-sky-100 ring-1 ring-slate-200/70">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-teal-200/50 blur-2xl" />
          <div className="absolute -bottom-12 -right-8 h-52 w-52 rounded-full bg-amber-200/40 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/illustrations/medical-team.svg" alt="Illustration of a medical team" className="absolute inset-0 h-full w-full object-contain p-6 sm:p-10" />
        </div>
      </header>

      <section className="mt-12" aria-labelledby="what">
        <h2 id="what" className="text-2xl font-extrabold tracking-tight text-slate-900">What we do</h2>
        <ul className="mt-4 space-y-3 leading-relaxed text-slate-600">
          <li><Link href="/online-doctor-kenya" className="font-semibold text-teal-700 hover:underline">Online consultations</Link> — video visits with doctors, paid for with M-Pesa.</li>
          <li><Link href="/sick-off-sheet-online-kenya" className="font-semibold text-teal-700 hover:underline">Sick-off sheets</Link> — issued by a doctor after they have assessed you.</li>
          <li><Link href="/home-visits-nairobi" className="font-semibold text-teal-700 hover:underline">Home visits</Link> — nurses, physiotherapists and doctors who come to you.</li>
          <li><Link href="/ambulance-nairobi" className="font-semibold text-teal-700 hover:underline">An ambulance line</Link> for emergencies.</li>
          <li><Link href="/pharmacy" className="font-semibold text-teal-700 hover:underline">An online pharmacy</Link>, and a way to request <Link href="/contact" className="font-semibold text-teal-700 hover:underline">medical reports and forms</Link>.</li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="trust">
        <h2 id="trust" className="text-2xl font-extrabold tracking-tight text-slate-900">How we earn your trust</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-teal-600">
          <li>No provider can list themselves. Each submits their licence for review first — <Link href="/how-we-verify-providers" className="font-semibold text-teal-700 hover:underline">here is exactly what we check</Link>.</li>
          <li>Fees are set by providers and shown before you pay.</li>
          <li>We never see or store your M-Pesa PIN, and video consultations are not recorded.</li>
          <li>Reviews come only from patients who have had a completed appointment.</li>
          <li>Our <Link href="/privacy" className="font-semibold text-teal-700 hover:underline">privacy policy</Link> explains what we collect and why.</li>
        </ul>
      </section>

      {f.parentOrgName && f.parentOrgUrl && (
        <section className="mt-12" aria-labelledby="nonprofit">
          <h2 id="nonprofit" className="text-2xl font-extrabold tracking-tight text-slate-900">Our non-profit</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Care Bora sits alongside{" "}
            <a href={f.parentOrgUrl} className="font-semibold text-teal-700 underline-offset-2 hover:underline">{f.parentOrgName}, our non-profit organisation</a>,
            a youth-led organisation working to advance health equity and community health across Kenya. Its programmes, impact and team are
            described on its own website.
          </p>
        </section>
      )}

      <section className="mt-12" aria-labelledby="limits">
        <h2 id="limits" className="text-2xl font-extrabold tracking-tight text-slate-900">What Care Bora is not</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          We are not an emergency service and an online consultation does not replace an examination, tests or hospital care when you need
          them. In an emergency, call the ambulance line on <a href={`tel:${AMBULANCE_PHONE}`} className="font-semibold text-rose-700 hover:underline">{AMBULANCE_PHONE_DISPLAY}</a>,
          or 999 or 112.
        </p>
      </section>

      {/* Organisation details — only what has actually been supplied. */}
      {(f.legalName || f.registrationNumber) && (
        <section className="mt-12" aria-labelledby="org">
          <h2 id="org" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <Building2 className="h-6 w-6 text-teal-600" aria-hidden /> Organisation
          </h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
            {f.legalName && (<><dt className="font-semibold text-slate-500">Registered name</dt><dd className="text-slate-800">{f.legalName}</dd></>)}
            {f.registrationNumber && (<><dt className="font-semibold text-slate-500">Registration number</dt><dd className="text-slate-800">{f.registrationNumber}</dd></>)}
          </dl>
        </section>
      )}

      <section className="mt-12" aria-labelledby="contact">
        <h2 id="contact" className="text-2xl font-extrabold tracking-tight text-slate-900">Contact us</h2>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex items-center gap-3"><Mail className="h-5 w-5 text-teal-600" aria-hidden /><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-teal-700 hover:underline">{SUPPORT_EMAIL}</a></li>
          <li className="flex items-center gap-3"><Phone className="h-5 w-5 text-teal-600" aria-hidden /><a href={`tel:${SUPPORT_PHONE}`} className="hover:text-teal-700 hover:underline">{SUPPORT_PHONE_DISPLAY}</a></li>
          <li className="flex items-center gap-3"><MapPin className="h-5 w-5 text-teal-600" aria-hidden />{f.physicalAddress ?? "Nairobi, Kenya"}</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          Or <Link href="/contact" className="font-semibold text-teal-700 hover:underline">send us a message</Link>, including requests for medical documents.
        </p>
      </section>
    </article>
  );
}

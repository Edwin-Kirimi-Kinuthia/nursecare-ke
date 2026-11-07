import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, FileCheck2, UserCheck, MessageSquareWarning } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqList from "@/components/FaqList";
import { breadcrumbSchema, faqSchema, type Faq } from "@/lib/structured-data";
import { SERVICE_PAGES_UPDATED } from "@/lib/service-pages";

const PATH = "/how-we-verify-providers";

export const metadata: Metadata = {
  title: "How We Verify Doctors & Providers",
  description:
    "Exactly what Care Bora checks before a doctor, nurse or physiotherapist is listed, how patient reviews work, what verification does not mean, and how to check a clinician yourself.",
  alternates: { canonical: PATH },
  openGraph: { title: "How we verify doctors and providers · Care Bora Kenya", url: PATH, type: "article" },
};

const FAQS: Faq[] = [
  {
    q: "Does 'verified' mean Care Bora guarantees the outcome?",
    a: "No. Verification means we reviewed the provider's licence details before listing them. It is not a guarantee of any treatment, result or diagnosis, and it does not replace your own judgement or a second opinion.",
  },
  {
    q: "Can I check a clinician myself?",
    a: "Yes, and we encourage it. Doctors are registered with the Kenya Medical Practitioners and Dentists Council and nurses with the Nursing Council of Kenya, which publish registers of licensed practitioners. Where a provider has supplied their licence details, they appear on their Care Bora profile so you know what to look up.",
  },
  {
    q: "Who can leave a review?",
    a: "Only a patient who has had a completed appointment with that provider, and only once per appointment. Providers cannot write or edit reviews about themselves.",
  },
  {
    q: "What if I have a concern about a provider?",
    a: "Tell us through the Contact page and choose 'Complaint'. Our team reads every complaint, and a provider can be removed from the directory.",
  },
];

export default function HowWeVerifyPage() {
  const trail: [string, string][] = [["Home", "/"], ["How we verify providers", PATH]];
  const updated = new Date(SERVICE_PAGES_UPDATED).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={breadcrumbSchema(trail)} />
      <JsonLd data={faqSchema(FAQS, PATH)} />
      <Breadcrumbs trail={trail} />

      <header className="page-banner page-banner--inset">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-teal-600"><ShieldCheck className="h-4 w-4" aria-hidden /> Trust and safety</p>
        <h1 className="page-title mt-4 text-slate-900">How we verify doctors and providers</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Choosing someone to treat you means trusting them. Here is exactly what we check before a clinician appears on Care Bora, what
          that does and does not tell you, and how you can check for yourself.
        </p>
        <p className="mt-4 text-xs text-slate-400">Written by the Care Bora team · Last checked {updated}.</p>
      </header>

      <section className="mt-12" aria-labelledby="process">
        <h2 id="process" className="text-2xl font-semibold tracking-tight text-slate-900">What a provider has to submit</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          Nobody can list themselves. Every doctor, nurse, physiotherapist or pharmacy professional applies, and their application stays out of
          the directory until our team has reviewed it. The application asks for:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-teal-600">
          <li>Their practice licence number and the body that issued it</li>
          <li>A copy of their licence document</li>
          <li>A passport-style photograph, which is shown on their public profile once approved</li>
          <li>Their specialty, qualifications and years of experience</li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="review">
        <h2 id="review" className="text-2xl font-semibold tracking-tight text-slate-900">What we do with it</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <FileCheck2 className="h-6 w-6 text-teal-600" aria-hidden />
            <h3 className="mt-3 font-bold text-slate-900">We review the documents</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">A member of our team reads the licence document alongside the number and details the provider entered, and approves or rejects the application.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <UserCheck className="h-6 w-6 text-teal-600" aria-hidden />
            <h3 className="mt-3 font-bold text-slate-900">Only approved providers are listed</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">Until an application is approved the provider doesn&apos;t appear in the directory, can&apos;t be booked, and their profile page is hidden from search engines.</p>
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="limits">
        <h2 id="limits" className="text-2xl font-semibold tracking-tight text-slate-900">What verification does not mean</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          It means we reviewed the licence details a provider gave us. It does not mean we guarantee any diagnosis, treatment or result, and it is
          not a substitute for your own judgement. You should always feel free to ask a provider about their experience, to seek a second
          opinion, or to look the clinician up on their regulator&apos;s public register: the Kenya Medical Practitioners and Dentists Council for
          doctors, and the Nursing Council of Kenya for nurses.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="reviews">
        <h2 id="reviews" className="text-2xl font-semibold tracking-tight text-slate-900">How reviews work</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          Only a patient who has had a completed appointment can review that provider, once per appointment. Reviews show the reviewer&apos;s
          name and are shown on the provider&apos;s profile, with an average rating once they have any. Providers can&apos;t write or edit reviews
          about themselves, and our team can hide a review that breaks the rules.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="concerns">
        <h2 id="concerns" className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <MessageSquareWarning className="h-6 w-6 text-teal-600" aria-hidden /> If something goes wrong
        </h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          If you have a concern about a provider, <Link href="/contact" className="font-semibold text-teal-700 underline-offset-2 hover:underline">message us</Link> and
          choose &ldquo;Complaint&rdquo;. We read every one, and a provider can be removed from the directory.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight text-slate-900">Questions people ask</h2>
        <FaqList faqs={FAQS} className="mt-5" />
      </section>
    </article>
  );
}

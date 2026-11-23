import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, ArrowUpRight, Video, Pill, Home as HomeIcon, FlaskConical,
  FileText, Ambulance, Phone, BadgeCheck, CreditCard, CalendarDays, Star,
} from "lucide-react";
import { providerService, reviewService } from "@carebora/core";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { JsonLd } from "@/components/JsonLd";
import ProviderCard from "@/components/ProviderCard";
import FaqList from "@/components/FaqList";
import heroImg from "@/assets/home/hero-video-call.jpg";
import { organizationSchema, websiteSchema, faqSchema, HOME_FAQS } from "@/lib/structured-data";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const revalidate = 600;

const SERVICES = [
  { title: "Online consultations", description: "Choose a doctor or nurse and book a private video appointment.", href: "/providers", Icon: Video },
  { title: "Pharmacy delivery", description: "Find medication, compare pharmacy offers, and arrange delivery.", href: "/pharmacy", Icon: Pill },
  { title: "Care at home", description: "Request a visit from a nurse, doctor, or physiotherapist.", href: "/home-visits", Icon: HomeIcon },
  { title: "Laboratory tests", description: "Find an approved laboratory and access your results in your account.", href: "/labs", Icon: FlaskConical },
  { title: "Medical documents", description: "Request a medical report, sick-off sheet, or other clinical document.", href: "/contact", Icon: FileText },
  { title: "Ambulance requests", description: "Contact the ambulance line or follow a request through your account.", href: "/ambulance", Icon: Ambulance },
] as const;

const STEPS = [
  { title: "Choose your clinician", description: "Read their profile, check their practice details, and see the consultation fee before you book." },
  { title: "Book a time and pay", description: "Select an open time. Once your appointment is confirmed, pay the fee with M-Pesa." },
  { title: "Join your appointment", description: "Open your appointment from your account to join the video call and speak with your clinician." },
];

export default async function HomePage() {
  // Only published provider records and reviews from completed appointments.
  // A missing database never becomes a reason to show invented people or figures.
  const [providerResult, reviewResult] = await Promise.allSettled([
    providerService.list({ limit: 3, offset: 0 }),
    reviewService.featured(3),
  ]);
  const providers: ProviderPublicProfile[] = providerResult.status === "fulfilled"
    ? JSON.parse(JSON.stringify(providerResult.value.providers)) : [];
  const reviews = reviewResult.status === "fulfilled" ? reviewResult.value : [];

  return (
    <div className="overflow-x-clip">
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={faqSchema()} />

      <section className="bg-[#eef5ed]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
          <div>
            <p className="text-sm font-semibold tracking-wide text-teal-800">CARE BORA · CARE THAT FITS YOUR LIFE</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[#173c32] sm:text-5xl">The care you need.<br />One place to find it.</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">Talk to a clinician, order medicine, or arrange care at home. Choose a service and take the next step.</p>
            <a href="#services" className="button-primary mt-6">Explore our services <ArrowRight className="h-4 w-4" /></a>
            <Link href="/appointments" className="ml-5 inline-flex py-3 text-sm font-semibold text-teal-800">My appointments <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-[2rem] lg:block">
            <Image src={heroImg} alt="A patient speaking to a doctor by video" fill placeholder="blur" priority sizes="480px" className="object-cover" />
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl bg-white/95 p-4 text-sm text-teal-900"><BadgeCheck className="h-6 w-6" />Licence-checked clinicians. Fees shown before booking.</div>
          </div>
        </div>
      </section>
      <section id="services" aria-labelledby="services-heading" className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-teal-700">How can we help today?</p><h2 id="services-heading" className="mt-2 text-3xl font-semibold tracking-tight">Choose your service</h2></div><span className="text-sm text-slate-500 sm:hidden">Swipe to explore →</span></div>
        <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ title, description, href, Icon }, i) => (
            <Link key={href} href={href} className="group min-w-[82%] snap-start rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-teal-500 hover:shadow-lg sm:min-w-0">
              <div className="flex items-center justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${i === 5 ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-800"}`}><Icon className="h-6 w-6" /></span><ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-teal-700" /></div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800">Get started <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 sm:hidden">{SERVICES.map(s => <Link key={s.href} href={s.href} className="rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">{s.title} ↗</Link>)}</div>
      </section>

      <section aria-label="About booking with Care Bora" className="border-b border-slate-200 bg-[#e3ebda]">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:grid-cols-3 sm:gap-8">
          {[
            { Icon: BadgeCheck, text: "Provider licences reviewed", href: "/how-we-verify-providers" },
            { Icon: CreditCard, text: "Consultation fees shown upfront", href: "/providers" },
            { Icon: CalendarDays, text: "Appointments in your account", href: "/appointments" },
          ].map(({ Icon, text, href }) => (
            <Link key={text} href={href} className="flex items-center gap-3 text-sm text-slate-600 hover:text-teal-700">
              <Icon className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={1.7} aria-hidden />{text}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Emergency — straight after the hero; nobody in an emergency should have to scroll or sign in. */}
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <div className="relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:flex-row sm:items-center sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-white/60">
            <Ambulance className="relative h-6 w-6 text-rose-600" />
          </span>
          <div className="relative flex-1">
            <h2 className="text-lg font-bold">Need an ambulance?</h2>
            <p className="mt-0.5 text-sm text-rose-800">Call the ambulance line for urgent assistance, or track a request in the app.</p>
          </div>
          <div className="relative flex w-full shrink-0 flex-col gap-2 min-[400px]:flex-row sm:w-auto">
            <a href={`tel:${AMBULANCE_PHONE}`} className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-bold text-rose-600 shadow transition hover:bg-rose-50 sm:flex-none">
              <Phone className="h-4 w-4" /> <span className="sm:hidden">Call ambulance</span><span className="hidden sm:inline">Call {AMBULANCE_PHONE_DISPLAY}</span>
            </a>
            <Link href="/ambulance" className="flex flex-1 items-center justify-center rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 sm:flex-none">
              Request
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8" aria-labelledby="download-apps-heading">
        <div className="flex flex-col items-start gap-5 rounded-2xl border border-teal-100 bg-teal-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="download-apps-heading" className="text-xl font-bold text-slate-900">Take Care Bora with you</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Download the app for Android, Windows, macOS or Linux and use your existing Care Bora account.</p>
          </div>
          <Link href="/download" className="button-primary shrink-0">Download the apps <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </section>

      {providers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="providers-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Our care providers</p>
              <h2 id="providers-heading" className="section-title mt-2 text-3xl text-slate-900">Choose who cares for you</h2>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-600">Read their practice details and see their fees before making an appointment.</p>
            </div>
            <Link href="/providers" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">View all providers <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">{providers.map(p => <ProviderCard key={p.userId} p={p} />)}</div>
        </section>
      )}

      <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200 bg-[#e3ebda]" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-sm font-medium text-teal-700">Your first appointment</p>
          <h2 id="how-heading" className="section-title mt-2 text-3xl text-slate-900">How online consultations work</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((step, i) => (
              <div key={step.title} className="border-t border-slate-300 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#234f34] text-sm font-semibold tabular-nums text-white shadow-lg shadow-[#16361d]/20">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
          <Link href="/online-doctor-kenya" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">Read about online visits <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="section-title text-3xl text-slate-900">From patients who have used Care Bora</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {reviews.map(review => (
              <figure key={review.id} className="border-t border-slate-200 pt-5">
                <div className="flex items-center gap-1 text-sm text-slate-600"><Star className="h-4 w-4 fill-teal-700 text-teal-700" aria-hidden />{review.rating} out of 5</div>
                <blockquote className="mt-4 leading-relaxed text-slate-800">&ldquo;{review.comment}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm"><span className="font-medium text-slate-900">{review.reviewer}</span><Link href={`/providers/${review.providerId}`} className="mt-1 block text-slate-500 hover:text-teal-700">Patient of {review.providerName}</Link></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 lg:grid-cols-[.75fr_1.5fr] lg:gap-16" aria-labelledby="faq-heading">
        <div><h2 id="faq-heading" className="section-title text-3xl text-slate-900">Questions about Care Bora</h2><p className="mt-4 leading-relaxed text-slate-600">If you would rather speak to someone, <Link href="/contact" className="font-medium text-teal-700 underline underline-offset-4">contact our team</Link>.</p></div>
        <FaqList faqs={HOME_FAQS} />
      </section>


    </div>
  );
}

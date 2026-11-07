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
import Reveal from "@/components/Reveal";
import heroImg from "@/assets/home/hero-video-call.jpg";
import { organizationSchema, websiteSchema, faqSchema, HOME_FAQS } from "@/lib/structured-data";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from "@/lib/contact";
import { CARE_IMAGES } from "@/lib/care-imagery";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const revalidate = 600;

const SERVICES = [
  { title: "Online consultations", description: "Choose a doctor or nurse and book a private video appointment.", href: "/online-doctor-kenya", Icon: Video },
  { title: "Pharmacy delivery", description: "Find medication, compare pharmacy offers, and arrange delivery.", href: "/pharmacy", Icon: Pill },
  { title: "Care at home", description: "Request a visit from a nurse, doctor, or physiotherapist.", href: "/home-visits-nairobi", Icon: HomeIcon },
  { title: "Laboratory tests", description: "Find an approved laboratory and access your results in your account.", href: "/labs", Icon: FlaskConical },
  { title: "Medical documents", description: "Request a medical report, sick-off sheet, or other clinical document.", href: "/contact", Icon: FileText },
  { title: "Ambulance requests", description: "Contact the ambulance line or follow a request through your account.", href: "/ambulance-nairobi", Icon: Ambulance },
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

      {/* ── Hero — sage sky, clouds and rolling hills, with the consultation photo at its centre. */}
      <section className="hero-sky relative isolate overflow-hidden">
        <Cloud className="hero-cloud right-[-2rem] top-24 hidden w-44 sm:block" />
        <Cloud className="hero-cloud slow -left-16 top-[46%] hidden w-72 opacity-80 lg:block" />
        <Hills />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:pt-14 lg:min-h-[840px] lg:pb-14">
          {/* Giant display line, partly behind the photo */}
          <h1 className="relative z-0 text-center lg:text-left">
            <span className="hero-title animate-slide-up block text-[clamp(3rem,10.5vw,9.25rem)] uppercase">Quality care</span>
            <span className="sr-only">, made accessible — online doctors, pharmacy delivery and care at home in Kenya.</span>
          </h1>

          <p className="animate-fade-in delay-100 mx-auto mt-4 flex max-w-xs items-start justify-center gap-2.5 text-center text-lg leading-snug text-white/95 lg:absolute lg:left-4 lg:top-[15rem] lg:max-w-[15rem] lg:mx-0 lg:mt-0 lg:justify-start lg:text-left xl:left-6">
            <span aria-hidden className="mt-2 grid shrink-0 grid-cols-2 gap-[2px]"><span className="h-1.5 w-1.5 bg-white" /><span className="h-1.5 w-1.5" /><span className="h-1.5 w-1.5 bg-[#1f5a26]" /><span className="h-1.5 w-1.5 bg-white" /></span>
            Licence-checked doctors, right on your phone.
          </p>

          <div className="relative z-20 mt-6 flex flex-wrap justify-center gap-3 lg:hidden">
            <Link href="/providers" className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-900">
              Find a provider <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pharmacy" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/50 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/20">
              Browse the pharmacy
            </Link>
          </div>

          {/* The photo — the centrepiece */}
          <div className="animate-fade-in delay-200 relative z-10 mx-auto mt-8 w-full max-w-xl lg:absolute lg:left-1/2 lg:top-[9rem] lg:mt-0 lg:w-[min(38vw,520px)] lg:max-w-none lg:-translate-x-1/2">
            <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(230,245,232,.7),transparent)]" />
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl shadow-xl shadow-[#16361d]/25 ring-1 ring-white/50">
              <Image src={heroImg} alt="A woman on a video consultation with a smiling doctor on her laptop" fill placeholder="blur" fetchPriority="high" loading="eager"
                sizes="(min-width: 1024px) 520px, 92vw" className="object-cover" />
            </div>
            {/* Floating label, like a product tag */}
            <div className="hero-glass float-slow absolute -left-4 -top-5 flex items-center gap-2.5 rounded-xl px-3 py-2 shadow-lg ring-1 ring-white/50 sm:-left-12" style={{ ["--r" as string]: "-2deg" }}>
              <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-[#1f5a26] text-white"><Video className="h-4.5 w-4.5" /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-white" /></span>
              <div className="text-xs leading-tight text-[#16361d]"><div className="font-semibold">Video consultation</div><div>A doctor is available now</div></div>
            </div>
          </div>

          {/* Right: meet the clinicians */}
          <Link href="/providers" className="group mx-auto mt-10 hidden w-56 lg:absolute lg:right-6 lg:top-[10.5rem] lg:mt-0 lg:block">
            <div className="relative h-40 overflow-hidden rounded-lg bg-[#5f8a67] shadow-xl shadow-[#16361d]/25">
              <Image src={CARE_IMAGES.portrait.src} alt={CARE_IMAGES.portrait.alt} fill placeholder="blur" sizes="224px" className="object-cover object-[center_15%] transition duration-500 group-hover:scale-105" />
              <span className="hero-glass absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-[#16361d]">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#16361d] text-white"><BadgeCheck className="h-2.5 w-2.5" /></span> Our clinicians
              </span>
            </div>
            <p className="mt-2 text-xs leading-snug text-white/90">Doctors and nurses whose practice licences we&apos;ve reviewed.</p>
          </Link>

          <span aria-hidden className="hero-title pointer-events-none relative z-20 mt-8 hidden text-[clamp(3rem,7.5vw,7rem)] lg:absolute lg:right-4 lg:top-[28.5rem] lg:mt-0 lg:block">
            Accessible.
          </span>

          {/* Bottom row: two glass cards on the left, the promise on the right */}
          <div className="relative z-20 mt-10 grid gap-4 lg:absolute lg:inset-x-4 lg:bottom-12 lg:mt-0 lg:grid-cols-[minmax(0,15.5rem)_minmax(0,14rem)_1fr] lg:items-end xl:inset-x-6">
            <div className="grid grid-cols-2 gap-3 lg:contents">
              <Link href="/pharmacy" className="hero-glass group relative flex flex-col overflow-hidden rounded-md p-4 shadow-xl shadow-[#16361d]/15 transition hover:-translate-y-1 lg:h-72 lg:p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-medium text-[#13261a] sm:text-2xl">Pharmacy</h2>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#13261a] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-xs text-[#2b4232] sm:text-sm">Everyday medicines, delivered to your door.</p>
                <div className="relative mt-3 min-h-24 flex-1 overflow-hidden rounded-md lg:min-h-0">
                  <Image src={CARE_IMAGES.pharmacy.src} alt={CARE_IMAGES.pharmacy.alt} fill placeholder="blur" sizes="(min-width: 1024px) 220px, 45vw" className="object-cover transition duration-500 group-hover:scale-105" />
                </div>
              </Link>
              <Link href="/how-we-verify-providers" className="hero-glass group flex flex-col rounded-md p-4 shadow-xl shadow-[#16361d]/15 transition hover:-translate-y-1 lg:h-44 lg:p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-medium text-[#13261a]">Licence-checked</h2>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#13261a] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-xs text-[#2b4232] sm:text-sm">Every clinician&apos;s licence is reviewed before they appear.</p>
                <BadgeCheck className="mt-auto h-9 w-9 self-center text-[#1f5a26] transition duration-500 group-hover:scale-110 lg:h-12 lg:w-12" />
              </Link>
            </div>

            <div className="rounded-lg bg-[#24472d]/95 p-5 lg:justify-self-end">
              <p className="mx-auto max-w-md border-white/80 text-center text-lg leading-snug text-white sm:text-xl lg:mx-0 lg:max-w-lg lg:border-l-4 lg:pl-5 lg:text-left lg:text-[1.35rem]">
                Speak to a qualified doctor by video, get prescriptions when appropriate, and have your
                medicines delivered to your doorstep.
              </p>
              <div className="mt-6 hidden justify-start gap-3 lg:flex lg:pl-6">
                <Link href="/providers" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1f5a26] px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#0b1f10]/30 transition hover:-translate-y-0.5 hover:bg-[#184a1f]">
                  Find a provider <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pharmacy" className="inline-flex items-center justify-center gap-2 rounded-md bg-white/20 px-6 py-3.5 font-semibold text-white ring-1 ring-white/40 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/30">
                  <Pill className="h-4 w-4" /> Browse the pharmacy
                </Link>
              </div>
              <p className="mt-4 text-center text-sm text-white/90 lg:pl-6 lg:text-left">
                Need help booking? <a href={`tel:${SUPPORT_PHONE}`} className="whitespace-nowrap font-semibold underline decoration-white/50 underline-offset-4 hover:decoration-white">{SUPPORT_PHONE_DISPLAY}</a>
              </p>
            </div>
          </div>
        </div>
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
        <div className="relative flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white shadow-lg shadow-rose-500/20 sm:flex-row sm:items-center sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <span className="ring-pulse relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-white/60">
            <Ambulance className="relative h-6 w-6 text-rose-600" />
          </span>
          <div className="relative flex-1">
            <h2 className="text-lg font-bold">Medical emergency? An ambulance is ready.</h2>
            <p className="mt-0.5 text-sm text-rose-50">Call our ambulance line now — or send a request in the app and follow its status.</p>
          </div>
          <div className="relative flex w-full shrink-0 flex-col gap-2 min-[400px]:flex-row sm:w-auto">
            <a href={`tel:${AMBULANCE_PHONE}`} className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 py-3 text-sm font-bold text-rose-600 shadow transition hover:bg-rose-50 sm:flex-none">
              <Phone className="h-4 w-4" /> <span className="sm:hidden">Call ambulance</span><span className="hidden sm:inline">Call {AMBULANCE_PHONE_DISPLAY}</span>
            </a>
            <Link href="/ambulance" className="flex flex-1 items-center justify-center rounded-xl border border-white/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex-none">
              Request
            </Link>
          </div>
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

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20" aria-labelledby="services-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-teal-700">How can we help?</p>
            <h2 id="services-heading" className="section-title mt-2 text-3xl text-slate-900 sm:text-4xl">Care for your everyday life.</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-slate-600">An appointment, a prescription, or a visit at home. Start with the service you need.</p>
          </div>
          <Link href="/appointments" className="button-secondary">My appointments <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {SERVICES.slice(0, 3).map(({ title, description, href }, i) => {
            const photo = [CARE_IMAGES.consultation, CARE_IMAGES.pharmacy, CARE_IMAGES.homeVisit][i];
            return (
              <Reveal key={href} delay={i * 90} className="h-full">
              <Link href={href} className="service-photo-link group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#e5ecdc] transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#16361d]/10">
                <div className="service-photo aspect-[4/3]">
                  <Image src={photo.src} alt={photo.alt} fill placeholder="blur" sizes="(min-width: 768px) 360px, 92vw" className={i === 0 ? "object-[center_40%]" : ""} />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-medium tracking-tight text-slate-900">{title}</h3><ArrowUpRight className="h-5 w-5 shrink-0 text-teal-700 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden /></div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
                </div>
              </Link>
              </Reveal>
            );
          })}
        </div>
          <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
            {SERVICES.slice(3).map(({ title, description, href, Icon }) => (
              <Link key={title} href={href} className="group border-t border-slate-300 py-6">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-teal-700" strokeWidth={1.6} aria-hidden />
                  <h3 className="flex-1 font-semibold text-slate-900 group-hover:text-teal-700">{title}</h3>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-teal-700" aria-hidden />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
              </Link>
            ))}
          </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200 bg-[#e3ebda]" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-sm font-medium text-teal-700">Your first appointment</p>
          <h2 id="how-heading" className="section-title mt-2 text-3xl text-slate-900">How online consultations work</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 120} className="border-t border-slate-300 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#234f34] text-sm font-semibold tabular-nums text-white shadow-lg shadow-[#16361d]/20">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </Reveal>
            ))}
          </div>
          <Link href="/online-doctor-kenya" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">Read about online visits <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[.85fr_1.15fr] lg:gap-20" aria-labelledby="trust-heading">
        <div>
          <p className="text-sm font-medium text-teal-700">Before you book</p>
          <h2 id="trust-heading" className="section-title mt-2 text-3xl text-slate-900">Know what to expect.</h2>
          <p className="mt-4 leading-relaxed text-slate-600">Choosing a clinician is a personal decision. We make their practice information, fees, and patient reviews available so you can decide.</p>
          <Link href="/how-we-verify-providers" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:underline">How we review providers <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <dl className="divide-y divide-slate-200 border-y border-slate-200">
          {[
            { title: "Practice licences reviewed", text: "Every clinician submits their licence details for review before appearing in the provider directory." },
            { title: "Clear consultation fees", text: "Providers set their own fees. You can see the amount on their profile before making an appointment." },
            { title: "Your records in your account", text: "Access appointment details and prescriptions from your account. Our privacy policy explains how your information is handled." },
          ].map(item => (
            <div key={item.title} className="py-5"><dt className="font-semibold text-slate-900">{item.title}</dt><dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</dd></div>
          ))}
        </dl>
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

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f6638] via-[#24532c] to-[#16361d] p-7 sm:p-10">
          <div aria-hidden className="dot-grid pointer-events-none absolute inset-0" />
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div><h2 className="text-2xl font-medium tracking-tight text-white sm:text-3xl">Let’s make time for your health.</h2><p className="mt-3 text-[#e0ead7]">Choose a clinician and find a time that suits you.</p></div>
          <Link href="/providers" className="button-light">Find a provider <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </section>
    </div>
  );
}

/** A soft cumulus cloud, drawn so the hero needs no image download for its sky. */
function Cloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 90" aria-hidden className={className}>
      <defs><linearGradient id="cloud-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d6e2d8" /></linearGradient></defs>
      <path fill="url(#cloud-g)" d="M38 82c-18 0-30-11-30-25 0-13 11-24 25-24 3-17 18-29 36-29 15 0 28 8 34 21 4-2 9-3 14-3 18 0 32 13 33 30 14 1 25 11 25 23 0 4-1 7-3 10-2 1-4 2-7 2H38z" />
    </svg>
  );
}

/** Layered rolling hills along the bottom of the hero. */
function Hills() {
  return (
    <svg viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] w-full lg:h-[48%]">
      <defs>
        <linearGradient id="hill-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9c9a6" /><stop offset="1" stopColor="#6f9a6e" /></linearGradient>
        <linearGradient id="hill-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fae73" /><stop offset="1" stopColor="#4c7d4b" /></linearGradient>
        <linearGradient id="hill-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5f9455" /><stop offset="1" stopColor="#2f5f33" /></linearGradient>
      </defs>
      <path fill="url(#hill-a)" opacity=".75" d="M0 150C160 90 330 70 520 110s330 90 520 40 300-90 400-70v280H0z" />
      <path fill="url(#hill-b)" d="M0 220c180-70 360-80 560-30s360 60 560 10 260-40 320-20v180H0z" />
      <path fill="url(#hill-c)" d="M0 290c220-40 420-30 640 0s440 20 800-30v100H0z" />
    </svg>
  );
}

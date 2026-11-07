import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import heroImg from "@/assets/home/hero-video-call.jpg";
import homeVisitImg from "@/assets/home/home-visit.jpg";
import {
  Video, Pill, HomeIcon, ShieldCheck, Smartphone, ArrowRight, Star, FileText, Ambulance, Phone,
  BadgeCheck, FlaskConical, Clock, Lock, MapPin, ArrowUpRight,
} from "lucide-react";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema, faqSchema, HOME_FAQS } from "@/lib/structured-data";
import FaqList from "@/components/FaqList";
import Reveal from "@/components/Reveal";
import { reviewService } from "@carebora/core";

// Title and description come from the root layout's defaults, which are written
// for the homepage; this just pins its canonical.
export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Refreshed every ten minutes: fresh enough for reviews, cheap to serve. */
export const revalidate = 600;

/**
 * Pale sage panels and forest-green actions repeat the reference's palette.
 * Illustrations and labels distinguish services within the shared theme.
 */
const SERVICES = [
  { title: "See a doctor online", desc: "Private video consultations with licence-checked doctors and nurses, from anywhere in Kenya.", href: "/online-doctor-kenya", art: "/illustrations/svc-video.svg", Icon: Video,
    card: "from-teal-50 to-emerald-50 ring-teal-100", icon: "bg-teal-600", link: "text-teal-700" },
  { title: "Pharmacy delivery", desc: "Everyday medicines from licensed pharmacies, delivered to your door.", href: "/pharmacy", art: "/illustrations/svc-pharmacy.svg", Icon: Pill,
    card: "from-[#dce8d3] to-[#edf2e5] ring-teal-200", icon: "bg-teal-700", link: "text-teal-800" },
  { title: "Care at home", desc: "A nurse or physiotherapist comes to you.", href: "/home-visits-nairobi", art: "/illustrations/svc-home.svg", Icon: HomeIcon,
    card: "from-[#e5eddc] to-[#f1f4e9] ring-teal-200", icon: "bg-teal-600", link: "text-teal-800" },
  { title: "Lab tests", desc: "Book tests at an approved lab; results land in your record.", href: "/labs", art: "/illustrations/svc-lab.svg", Icon: FlaskConical,
    card: "from-[#d6e3cd] to-[#ecf0e2] ring-teal-200", icon: "bg-teal-700", link: "text-teal-800" },
  { title: "Sick-off sheets & forms", desc: "Medical reports and school, work or insurance forms, signed by a clinician.", href: "/contact", art: "/illustrations/svc-docs.svg", Icon: FileText,
    card: "from-[#e7edde] to-[#f3f5ec] ring-teal-200", icon: "bg-teal-600", link: "text-teal-800" },
] as const;

const STEPS = [
  { n: "1", title: "Create an account", desc: "Sign up in seconds — all you need is an email.", art: "/illustrations/step-signup.svg", tint: "bg-teal-50", badge: "bg-teal-600" },
  { n: "2", title: "Find your provider", desc: "Browse licence-checked clinicians, see their fees and pick an open time.", art: "/illustrations/step-find.svg", tint: "bg-[#e5eddc]", badge: "bg-teal-700" },
  { n: "3", title: "Pay, then see your doctor", desc: "Pay with M-Pesa, then join a private video call at your time.", art: "/illustrations/step-pay.svg", tint: "bg-[#dce8d3]", badge: "bg-teal-800" },
];

const WHY = [
  { Icon: BadgeCheck, title: "Licence-checked clinicians", desc: "Every provider submits their practice licence for review before they appear.", tone: "bg-teal-50 text-teal-700" },
  { Icon: Lock, title: "Private by design", desc: "Your records are yours. You choose who else can see them.", tone: "bg-teal-100 text-teal-700" },
  { Icon: Smartphone, title: "Pay with M-Pesa", desc: "Fees shown upfront. No cards, no surprises.", tone: "bg-teal-50 text-teal-700" },
  { Icon: FileText, title: "Documents you can use", desc: "Sick-off sheets, medical reports and forms, signed by a clinician.", tone: "bg-teal-100 text-teal-700" },
];

export default async function HomePage() {
  // Real reviews only. If there are none yet, the section is simply not shown —
  // an empty "what patients say" is honest; an invented one is not.
  let reviews: Awaited<ReturnType<typeof reviewService.featured>> = [];
  try { reviews = await reviewService.featured(3); } catch { reviews = []; }

  return (
    <div className="overflow-x-clip">
      {/* Tells search engines what this business is, where it operates and what
          it offers — the basis for rich results and health/local-intent matching. */}
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

          {/* Right: care at home */}
          <Link href="/home-visits-nairobi" className="group mx-auto mt-10 hidden w-56 lg:absolute lg:right-6 lg:top-[12rem] lg:mt-0 lg:block">
            <div className="relative h-32 overflow-hidden rounded-lg bg-[#5f8a67] shadow-xl shadow-[#16361d]/25">
              <Image src={homeVisitImg} alt="A nurse visiting a patient at home" fill sizes="224px" className="object-cover transition duration-500 group-hover:scale-105" />
              <span className="hero-glass absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-[#16361d]">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#16361d] text-white"><HomeIcon className="h-2.5 w-2.5" /></span> Care at home
              </span>
            </div>
            <p className="mt-2 text-xs leading-snug text-white/90">A nurse or physiotherapist comes to you, anywhere in Nairobi.</p>
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
                <div className="relative mt-3 flex-1">
                  <span aria-hidden className="absolute bottom-[-30%] left-1/2 h-44 w-44 -translate-x-1/2 rounded-full border-[14px] border-white/35" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/illustrations/svc-pharmacy.svg" alt="" className="relative mx-auto h-20 w-auto object-contain transition duration-500 group-hover:scale-110 lg:h-32" />
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
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — claims that are true at any size and stay true as the platform grows. */}
      <section className="relative z-10 mx-auto -mt-6 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 shadow-xl shadow-[#16361d]/10 ring-1 ring-[#deeadf] md:grid-cols-4">
          {[
            { Icon: BadgeCheck, k: "Licensed", v: "Every provider checked" },
            { Icon: MapPin, k: "Nationwide", v: "Video consultations" },
            { Icon: Clock, k: "24/7", v: "Ambulance line" },
            { Icon: Smartphone, k: "M-Pesa", v: "Pay in seconds" },
          ].map(({ Icon, k, v }) => (
            <div key={k} className="flex items-center gap-3 rounded-xl p-2 sm:p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#deeadf] text-[#1f5a26]"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 leading-tight"><div className="font-display font-semibold text-slate-900">{k}</div><div className="text-xs text-slate-500">{v}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Emergency — straight after the hero; nobody in an emergency should have to scroll or sign in. */}
      <section className="mx-auto max-w-6xl px-4 pt-4">
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

      {/* ── Services ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-600">What we offer</p>
          <h2 className="section-title mt-3 text-3xl text-slate-900 sm:text-4xl">Everything your family needs</h2>
          <p className="mt-3 text-slate-500">One place for consultations, medicines, tests and care at home.</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 90} className="h-full">
              <Link href={s.href} className={`group flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${s.card} ring-1 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-900/10`}>
                <div className="relative h-44 overflow-hidden sm:h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.art} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-110" />
                </div>
                <div className="flex flex-1 flex-col p-6 pt-2">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm ${s.icon}`}><s.Icon className="h-5 w-5" /></span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-slate-600">{s.desc}</p>
                  <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${s.link} transition-transform group-hover:translate-x-1`}>Learn more <ArrowRight className="h-4 w-4" /></span>
                </div>
              </Link>
            </Reveal>
          ))}

          {/* Emergency ambulance: there is no fitting illustration, so a bold icon composition in the same card language. */}
          <Reveal delay={180} className="h-full">
            <Link href="/ambulance-nairobi" className="group flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 ring-1 ring-rose-100 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-900/10">
              <div className="relative grid h-44 place-items-center overflow-hidden sm:h-48">
                <span className="absolute h-36 w-36 rounded-full bg-rose-100 transition-transform duration-500 group-hover:scale-110" />
                <span className="absolute h-24 w-24 rounded-full bg-rose-200/70" />
                <span className="ring-pulse relative grid h-16 w-16 place-items-center rounded-2xl bg-rose-500 text-rose-300 shadow-lg shadow-rose-500/30">
                  <Ambulance className="relative h-8 w-8 text-white" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500 text-white shadow-sm"><Ambulance className="h-5 w-5" /></span>
                <h3 className="mt-3 text-lg font-bold text-slate-900">Emergency ambulance</h3>
                <p className="mt-1 flex-1 text-sm text-slate-600">Call our line or send a request and follow its status.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 transition-transform group-hover:translate-x-1">Learn more <ArrowRight className="h-4 w-4" /></span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-teal-600">How it works</p>
            <h2 className="section-title mt-3 text-3xl text-slate-900 sm:text-4xl">Care in three simple steps</h2>
            <p className="mt-3 text-slate-500">From sign-up to your consultation, all from your phone.</p>
          </Reveal>
          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 130}>
                <div className="relative h-full rounded-3xl bg-white p-6 text-center ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
                  <div className={`relative mx-auto h-40 overflow-hidden rounded-2xl ${s.tint}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.art} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-4" />
                  </div>
                  <span className={`relative -mt-5 inline-grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white shadow-lg ring-4 ring-white ${s.badge}`}>{s.n}</span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400} className="mt-10 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:-translate-y-0.5 hover:bg-teal-700">
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Why Care Bora ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#e6efe5] via-[#f4f7f3] to-[#f4f7f3] py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#deeadf] via-[#eef4ed] to-[#cfe0cf]">
              <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-white/60" />
              <div className="absolute -bottom-12 -right-6 h-52 w-52 rounded-full bg-white/50" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/why-family.svg" alt="Illustration of a family walking together" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-8 sm:p-12" />
            </div>
            <div className="absolute -bottom-5 right-6 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <span className="text-sm font-bold text-slate-900">Your record, your rules</span>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-widest text-teal-600">Why Care Bora</p>
              <h2 className="section-title mt-3 text-3xl text-slate-900 sm:text-4xl">Care you can trust, for the whole family</h2>
              <p className="mt-3 text-slate-500">Built in Kenya, for how Kenyans actually get care: on the phone, paid with M-Pesa, with real clinicians.</p>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {WHY.map(({ Icon, title, desc, tone }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="h-full rounded-2xl bg-white p-5 ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/5">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
                    <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What patients say — only real reviews from completed appointments. */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="reviews">
          <Reveal className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-teal-600">Reviews</p>
            <h2 id="reviews" className="section-title mt-3 text-3xl text-slate-900 sm:text-4xl">What patients say</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.map((r, i) => {
              const tone = ["bg-teal-50", "bg-[#dce8d3]", "bg-[#e7edde]"][i % 3];
              return (
                <Reveal key={r.id} delay={i * 100}>
                  <figure className={`relative h-full rounded-3xl ${tone} p-6`}>
                    <span className="absolute right-6 top-3 font-serif text-6xl leading-none text-white" aria-hidden>&ldquo;</span>
                    <div className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-4 w-4 ${j < r.rating ? "fill-amber-400 text-amber-400" : "fill-white text-white"}`} />
                      ))}
                    </div>
                    <blockquote className="relative mt-3 text-slate-700">{r.comment}</blockquote>
                    <figcaption className="mt-4 text-sm">
                      <span className="font-semibold text-slate-900">{r.reviewer}</span>
                      <Link href={`/providers/${r.providerId}`} className="block text-slate-500 hover:text-teal-700 hover:underline">about {r.providerName}</Link>
                    </figcaption>
                  </figure>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ── FAQ — the same list emitted as FAQPage markup above. */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="faq">
        <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="lg:sticky lg:top-24">
            <p className="text-sm font-bold uppercase tracking-widest text-teal-600">FAQ</p>
            <h2 id="faq" className="section-title mt-3 text-3xl text-slate-900 sm:text-4xl">Questions people ask</h2>
            <p className="mt-3 text-slate-500">
              More in <Link href="/online-doctor-kenya" className="font-semibold text-teal-700 hover:underline">how online consultations work</Link> and{" "}
              <Link href="/how-we-verify-providers" className="font-semibold text-teal-700 hover:underline">how we verify providers</Link>.
            </p>
            <div className="relative mt-6 hidden aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#e6efe5] to-[#cfe0cf] lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/faq.svg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-8" />
            </div>
          </Reveal>
          <FaqList faqs={HOME_FAQS} />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <Reveal>
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#2f6638] via-[#24532c] to-[#16361d] px-6 py-12 sm:px-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="relative text-center lg:text-left">
              <h2 className="section-title text-3xl text-white sm:text-4xl">Ready to see a doctor?</h2>
              <p className="mx-auto mt-3 max-w-lg text-teal-50 lg:mx-0">Create a free account and get quality care from anywhere in Kenya.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-teal-800 transition hover:-translate-y-0.5">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/providers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                  Browse providers
                </Link>
              </div>
            </div>
            <div className="relative mx-auto aspect-[4/3] w-full max-w-sm rounded-[2rem] bg-white/95 p-5 shadow-2xl shadow-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/cta-booked.svg" alt="Illustration of a booked calendar" loading="lazy" className="h-full w-full object-contain" />
            </div>
          </div>
        </Reveal>
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

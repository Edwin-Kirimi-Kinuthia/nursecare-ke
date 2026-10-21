import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  Video, Pill, HomeIcon, ShieldCheck, Smartphone, ArrowRight, Star, FileText, Siren, Phone,
  UserPlus, Search, CreditCard, BadgeCheck, FlaskConical, CheckCircle2, Clock, Lock, MapPin, Stethoscope,
} from "lucide-react";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema, faqSchema, HOME_FAQS } from "@/lib/structured-data";
import FaqList from "@/components/FaqList";
import Reveal from "@/components/Reveal";
import PhotoWithFallback from "@/components/PhotoWithFallback";
import { reviewService, providerService, storefrontService } from "@carebora/core";

import heroImg from "@/assets/home/doctor-child.jpg";
import consultImg from "@/assets/home/consultation.jpg";
import pharmacyImg from "@/assets/home/pharmacy.jpg";
import homeVisitImg from "@/assets/home/home-visit.jpg";
import labImg from "@/assets/home/lab.jpg";
import ambulanceImg from "@/assets/home/ambulance.jpg";
import mhealthImg from "@/assets/home/mhealth.jpg";
import familyImg from "@/assets/home/mother-baby.jpg";
import nairobiImg from "@/assets/home/nairobi-dusk.jpg";

// Title and description come from the root layout's defaults, which are written
// for the homepage; this just pins its canonical.
export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Refreshed every ten minutes: fresh enough for reviews, cheap to serve. */
export const revalidate = 600;

type Service = { title: string; desc: string; href: string; img: StaticImageData; Icon: typeof Video; alt: string };
const SERVICES: Service[] = [
  { title: "See a doctor online", desc: "Private video consultations with licence-checked doctors and nurses, from anywhere in Kenya.", href: "/online-doctor-kenya", img: consultImg, Icon: Video, alt: "A doctor talking with a young patient in a clinic" },
  { title: "Pharmacy delivery", desc: "Everyday medicines from licensed pharmacies, delivered to your door.", href: "/pharmacy", img: pharmacyImg, Icon: Pill, alt: "A pharmacist serving a customer across a pharmacy counter" },
  { title: "Care at home", desc: "A nurse or physiotherapist comes to you.", href: "/home-visits-nairobi", img: homeVisitImg, Icon: HomeIcon, alt: "A health worker checking on a child outside a home" },
  { title: "Lab tests", desc: "Book tests at an approved lab; results land in your record.", href: "/labs", img: labImg, Icon: FlaskConical, alt: "A laboratory technician examining a sample" },
  { title: "Emergency ambulance", desc: "Call our line or send a request and follow its status.", href: "/ambulance-nairobi", img: ambulanceImg, Icon: Siren, alt: "An ambulance parked outside a community clinic" },
];

const STEPS = [
  { n: "01", Icon: UserPlus, title: "Create an account", desc: "Sign up in seconds as a patient — all you need is an email." },
  { n: "02", Icon: Search, title: "Find your provider", desc: "Browse licence-checked clinicians, see their fees, and pick an open time." },
  { n: "03", Icon: CreditCard, title: "Pay, then see your doctor", desc: "Pay with M-Pesa, then join a private video call at your time." },
];

const WHY = [
  { Icon: BadgeCheck, title: "Licence-checked clinicians", desc: "Every provider submits their practice licence for review before they appear." },
  { Icon: Lock, title: "Private by design", desc: "Your records are yours. You choose who else can see them." },
  { Icon: Smartphone, title: "Pay with M-Pesa", desc: "Fees shown upfront. No cards, no surprises." },
  { Icon: FileText, title: "Documents you can use", desc: "Sick-off sheets, medical reports and forms, signed by a clinician." },
];

export default async function HomePage() {
  // Real reviews only. If there are none yet, the section is simply not shown —
  // an empty "what patients say" is honest; an invented one is not.
  let reviews: Awaited<ReturnType<typeof reviewService.featured>> = [];
  try { reviews = await reviewService.featured(3); } catch { reviews = []; }

  // Real providers (with the photos they uploaded) and products with a photo.
  // Each section hides itself when there is nothing real to show.
  type Doc = { userId: string; specialty: string | null; isAvailable: boolean; user: { fullName: string; avatarUrl: string | null } };
  let doctors: Doc[] = [];
  let products: { drugId: string; name: string; imageUrl: string | null; bestPriceKes: number }[] = [];
  try {
    const list = await providerService.list({ limit: 8, offset: 0 } as never);
    doctors = JSON.parse(JSON.stringify(list.providers)).filter((d: Doc) => d.user.avatarUrl);
  } catch { doctors = []; }
  try {
    const res = await storefrontService.searchDrugs({ limit: 24, offset: 0 } as never);
    products = JSON.parse(JSON.stringify(res.drugs)).filter((d: { imageUrl: string | null }) => d.imageUrl && !d.imageUrl.startsWith("data:"));
  } catch { products = []; }

  const [primary, ...rest] = SERVICES;

  return (
    <div className="overflow-x-clip">
      {/* Tells search engines what this business is, where it operates and what
          it offers — the basis for rich results and health/local-intent matching. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={faqSchema()} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="animate-blob pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-teal-500/25 blur-3xl" />
        <div className="animate-blob pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl delay-200" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-2 lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="text-center lg:text-left">
            <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-teal-100 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
              Kenya&apos;s telehealth platform
            </span>
            <h1 className="animate-slide-up mt-6 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Quality care, <span className="gradient-text">made accessible.</span>
            </h1>
            <p className="animate-slide-up delay-100 mx-auto mt-6 max-w-xl text-base text-teal-100/90 sm:text-lg lg:mx-0">
              See a licence-checked doctor by video, get your medicines delivered, and book care at
              home — all paid for with M-Pesa, all in one place.
            </p>
            <div className="animate-slide-up delay-200 mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/providers" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-teal-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-teal-50">
                Find a provider <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pharmacy" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                <Pill className="h-4 w-4" /> Shop the pharmacy
              </Link>
            </div>

            {/* Real faces, when there are any */}
            {doctors.length >= 3 && (
              <div className="animate-fade-in delay-300 mt-8 flex items-center justify-center gap-3 lg:justify-start">
                <div className="flex -space-x-3">
                  {doctors.slice(0, 4).map((d) => (
                    <span key={d.userId} className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-teal-900 bg-teal-100">
                      <PhotoWithFallback src={d.user.avatarUrl!} name={d.user.fullName} className="h-full w-full object-cover object-top text-base" />
                    </span>
                  ))}
                </div>
                <p className="text-left text-sm text-teal-100/90"><span className="font-semibold text-white">Licence-checked clinicians</span><br />ready to see you online</p>
              </div>
            )}
          </div>

          {/* Photo with floating status cards */}
          <div className="animate-fade-in delay-200 relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl shadow-black/40 ring-1 ring-white/10 sm:aspect-[5/4]">
              <Image src={heroImg} alt="A doctor listening to a young patient's chest with a stethoscope" fill placeholder="blur" fetchPriority="high" loading="eager"
                sizes="(min-width: 1024px) 560px, 92vw" className="object-cover object-[30%_center]" />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/50 via-transparent to-transparent" />
            </div>
            <div className="float-slow absolute -left-3 top-6 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-black/20 sm:flex" style={{ ["--r" as string]: "-3deg" }}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
              <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">M-Pesa</div><div className="text-sm font-extrabold text-slate-900">Payment received</div></div>
            </div>
            <div className="float-slow d2 absolute -right-3 top-1/3 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-black/20 sm:flex" style={{ ["--r" as string]: "3deg" }}>
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-teal-100 text-teal-700"><Video className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" /></span>
              <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">Doctor</div><div className="text-sm font-extrabold text-slate-900">Available now</div></div>
            </div>
            <div className="float-slow d3 absolute -bottom-5 left-6 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-black/20 sm:left-10" style={{ ["--r" as string]: "-2deg" }}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Pill className="h-5 w-5" /></span>
              <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">Pharmacy</div><div className="text-sm font-extrabold text-slate-900">Delivered to your door</div></div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative border-t border-white/10 bg-black/10 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 md:grid-cols-4">
            {/* Claims that are true at any size and stay true as the platform grows. */}
            {[
              { Icon: BadgeCheck, k: "Licensed", v: "Every provider checked" },
              { Icon: MapPin, k: "Nationwide", v: "Video consultations" },
              { Icon: Clock, k: "24/7", v: "Ambulance line" },
              { Icon: Smartphone, k: "M-Pesa", v: "Pay in seconds" },
            ].map(({ Icon, k, v }) => (
              <div key={k} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-teal-200"><Icon className="h-5 w-5" /></span>
                <div className="leading-tight"><div className="font-extrabold text-white">{k}</div><div className="text-xs text-teal-200/90">{v}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Emergency — straight after the hero; nobody in an emergency should have to scroll or sign in. */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="ring-pulse relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-rose-300 shadow-lg shadow-rose-500/25">
            <Siren className="relative h-6 w-6 text-white" />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-rose-900">Medical emergency? An ambulance is ready.</h2>
            <p className="mt-1 text-sm text-rose-700">Call our ambulance line now — or send a request in the app and follow its status.</p>
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <a href={`tel:${AMBULANCE_PHONE}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-700 sm:flex-none">
              <Phone className="h-4 w-4" /> <span className="sm:hidden">Call ambulance</span><span className="hidden sm:inline">Call {AMBULANCE_PHONE_DISPLAY}</span>
            </a>
            <Link href="/ambulance" className="flex flex-1 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 sm:flex-none">
              Request
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services: photo bento ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-600">What we offer</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Everything your family needs</h2>
          <p className="mt-3 text-slate-500">One place for consultations, medicines, tests and care at home.</p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {primary && <ServiceTile s={primary} big className="md:col-span-2 lg:row-span-2" />}
          {rest.map((s, i) => (
            <Reveal key={s.title} delay={i * 80} className="h-full"><ServiceTile s={s} className="h-full" /></Reveal>
          ))}
        </div>

        <Reveal className="mt-4">
          <Link href="/contact" className="group flex flex-col items-start gap-4 rounded-3xl border border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 p-6 transition hover:border-teal-200 hover:shadow-lg sm:flex-row sm:items-center">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25"><FileText className="h-6 w-6" /></span>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Need a sick-off sheet or medical form?</h3>
              <p className="mt-1 text-sm text-slate-600">Request a sick-off sheet, medical report, or a school, employment or insurance form — a licensed clinician reviews and signs it.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 transition-transform group-hover:translate-x-1">Request a document <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </Reveal>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl shadow-slate-900/10">
              <Image src={mhealthImg} alt="Health workers looking at a mobile phone together" fill placeholder="blur" sizes="(min-width: 1024px) 560px, 92vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 right-4 rounded-2xl bg-teal-600 px-5 py-4 text-white shadow-xl shadow-teal-600/30 sm:right-8">
              <div className="text-2xl font-extrabold">Book in minutes</div>
              <div className="text-xs text-teal-100">at a time that suits you</div>
            </div>
          </Reveal>

          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-widest text-teal-600">How it works</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Care in three simple steps</h2>
            </Reveal>
            <ol className="relative mt-10 space-y-8">
              <span className="absolute bottom-6 left-7 top-6 w-px border-l-2 border-dashed border-teal-200" aria-hidden />
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 120}>
                  <li className="relative flex gap-5">
                    <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30">
                      <s.Icon className="h-6 w-6" />
                    </span>
                    <div className="pt-1">
                      <div className="text-xs font-black tracking-widest text-teal-500">STEP {s.n}</div>
                      <h3 className="mt-0.5 text-lg font-bold text-slate-900">{s.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={360}>
              <Link href="/login" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:-translate-y-0.5 hover:bg-teal-700">
                Create your free account <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Real providers ────────────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="meet">
          <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-teal-600">Our clinicians</p>
              <h2 id="meet" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Meet our providers</h2>
              <p className="mt-2 text-slate-500">Licence-checked doctors, nurses and therapists you can see from your phone.</p>
            </div>
            <Link href="/providers" className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:border-teal-200 hover:bg-teal-50">See all providers <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {doctors.slice(0, 8).map((d, i) => (
              <Reveal key={d.userId} delay={(i % 4) * 80}>
                <Link href={`/providers/${d.userId}`} className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-teal-900/10">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-teal-100 to-emerald-100">
                    <PhotoWithFallback src={d.user.avatarUrl!} name={d.user.fullName} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow ${d.isAvailable ? "text-emerald-700" : "text-amber-700"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${d.isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} /> {d.isAvailable ? "Available" : "Busy"}
                    </span>
                    <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-teal-700 shadow" title="Licence checked"><BadgeCheck className="h-4 w-4" /></span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="truncate font-bold text-slate-900">{d.user.fullName}</div>
                    <div className="truncate text-sm text-teal-700">{d.specialty ?? "Clinician"}</div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Why Care Bora ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-widest text-teal-600">Why Care Bora</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Care you can trust, for the whole family</h2>
              <p className="mt-3 text-slate-500">Built in Kenya, for how Kenyans actually get care: on the phone, paid with M-Pesa, with real clinicians.</p>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {WHY.map(({ Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-5 w-5" /></span>
                    <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl shadow-slate-900/10 lg:aspect-square">
              <Image src={familyImg} alt="A mother smiling with her young daughter" fill placeholder="blur" sizes="(min-width: 1024px) 560px, 92vw" className="object-cover object-[22%_center]" />
            </div>
            <div className="absolute -left-2 bottom-8 max-w-[15rem] rounded-2xl bg-white p-4 shadow-xl shadow-slate-900/15 sm:-left-6">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-teal-600" /><span className="text-sm font-bold text-slate-900">Your record, your rules</span></div>
              <p className="mt-1 text-xs text-slate-500">Allergies, medicines, results and notes in one private place.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The pharmacy, as it looks: a slow strip of real product photos ── */}
      {products.length >= 6 && (
        <section className="overflow-hidden border-y border-slate-200 bg-white py-14" aria-label="From the pharmacy">
          <Reveal className="mx-auto mb-8 flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-teal-600">Pharmacy</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Everyday medicines, delivered</h2>
            </div>
            <Link href="/pharmacy" className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">Shop now <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="marquee [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="marquee-track gap-4 px-2">
              {[...products, ...products].map((p, i) => {
                const tones = ["bg-[#E3F8FF]", "bg-[#DCFAFB]", "bg-[#FFE8DF]", "bg-[#F0FFF0]"];
                return (
                  <Link key={`${p.drugId}-${i}`} href="/pharmacy" aria-hidden={i >= products.length} tabIndex={i >= products.length ? -1 : 0}
                    className={`group w-40 shrink-0 overflow-hidden rounded-2xl ${tones[i % 4]} p-3 transition hover:-translate-y-1 hover:shadow-lg sm:w-44`}>
                    <div className="aspect-square overflow-hidden rounded-xl bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl!} alt={p.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="mt-2 truncate text-sm font-semibold text-slate-900">{p.name}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── What patients say — only real reviews from completed appointments. */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="reviews">
          <Reveal className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-teal-600">Reviews</p>
            <h2 id="reviews" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">What patients say</h2>
            <p className="mt-3 text-slate-500">From patients after a completed appointment.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={i * 100}>
                <figure className="relative h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg">
                  <span className="absolute right-6 top-4 font-serif text-6xl leading-none text-teal-100" aria-hidden>&ldquo;</span>
                  <div className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-4 w-4 ${j < r.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-slate-600">{r.comment}</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-semibold text-slate-900">{r.reviewer}</span>
                    <Link href={`/providers/${r.providerId}`} className="block text-slate-500 hover:text-teal-700 hover:underline">about {r.providerName}</Link>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ — the same list emitted as FAQPage markup above. */}
      <section className="mx-auto max-w-3xl px-4 py-20" aria-labelledby="faq">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-600">FAQ</p>
          <h2 id="faq" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Questions people ask</h2>
          <p className="mt-3 text-slate-500">
            More in <Link href="/online-doctor-kenya" className="font-semibold text-teal-700 hover:underline">how online consultations work</Link> and{" "}
            <Link href="/how-we-verify-providers" className="font-semibold text-teal-700 hover:underline">how we verify providers</Link>.
          </p>
        </Reveal>
        <FaqList faqs={HOME_FAQS} className="mt-10" />
      </section>

      {/* ── CTA over the Nairobi skyline ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-10 sm:py-20">
            <Image src={nairobiImg} alt="" fill placeholder="blur" sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-teal-950/90 via-teal-900/80 to-emerald-900/70" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100 backdrop-blur"><Stethoscope className="h-3.5 w-3.5" /> From Nairobi to every county</span>
              <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">Ready to see a doctor?</h2>
              <p className="mx-auto mt-3 max-w-lg text-teal-50/90">Create a free account and get quality care from anywhere in Kenya.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-teal-900 transition hover:-translate-y-0.5">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/providers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10">
                  Browse providers
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/** A photo card for one service: the picture zooms on hover; text sits on a gradient so it stays readable. */
function ServiceTile({ s, big, className = "" }: { s: Service; big?: boolean; className?: string }) {
  return (
    <Link href={s.href} className={`group relative block min-h-[15rem] overflow-hidden rounded-3xl bg-slate-900 shadow-sm ${big ? "min-h-[22rem] lg:min-h-full" : ""} ${className}`}>
      <Image src={s.img} alt={s.alt} fill placeholder="blur" sizes={big ? "(min-width: 1024px) 560px, (min-width: 768px) 92vw, 92vw" : "(min-width: 1024px) 280px, (min-width: 768px) 46vw, 92vw"}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur transition-transform duration-300 group-hover:-translate-y-1 group-hover:bg-teal-500">
          <s.Icon className="h-5 w-5" />
        </span>
        <h3 className={`mt-3 font-bold text-white ${big ? "text-2xl" : "text-lg"}`}>{s.title}</h3>
        <p className={`mt-1 text-white/80 ${big ? "max-w-md text-base" : "text-sm"}`}>{s.desc}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-200 transition-transform group-hover:translate-x-1">Learn more <ArrowRight className="h-4 w-4" /></span>
      </div>
    </Link>
  );
}

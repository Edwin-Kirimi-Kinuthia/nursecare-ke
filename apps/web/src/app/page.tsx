import type { Metadata } from "next";
import Link from "next/link";
import {
  Video, Pill, HomeIcon, ShieldCheck, Smartphone, ArrowRight, Star, FileText, Ambulance, Phone,
  BadgeCheck, FlaskConical, CheckCircle2, Clock, Lock, MapPin, Sparkles,
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
 * Each service has its own colour, used for its card tint, its icon and the
 * illustration's accent (the SVGs in /public/illustrations are recoloured to
 * match), so the grid reads as a set of distinct, friendly doors.
 */
const SERVICES = [
  { title: "See a doctor online", desc: "Private video consultations with licence-checked doctors and nurses, from anywhere in Kenya.", href: "/online-doctor-kenya", art: "/illustrations/svc-video.svg", Icon: Video,
    card: "from-teal-50 to-emerald-50 ring-teal-100", icon: "bg-teal-600", link: "text-teal-700" },
  { title: "Pharmacy delivery", desc: "Everyday medicines from licensed pharmacies, delivered to your door.", href: "/pharmacy", art: "/illustrations/svc-pharmacy.svg", Icon: Pill,
    card: "from-orange-50 to-rose-50 ring-orange-100", icon: "bg-[#f97366]", link: "text-[#d9483a]" },
  { title: "Care at home", desc: "A nurse or physiotherapist comes to you.", href: "/home-visits-nairobi", art: "/illustrations/svc-home.svg", Icon: HomeIcon,
    card: "from-sky-50 to-cyan-50 ring-sky-100", icon: "bg-sky-500", link: "text-sky-700" },
  { title: "Lab tests", desc: "Book tests at an approved lab; results land in your record.", href: "/labs", art: "/illustrations/svc-lab.svg", Icon: FlaskConical,
    card: "from-violet-50 to-fuchsia-50 ring-violet-100", icon: "bg-violet-500", link: "text-violet-700" },
  { title: "Sick-off sheets & forms", desc: "Medical reports and school, work or insurance forms, signed by a clinician.", href: "/contact", art: "/illustrations/svc-docs.svg", Icon: FileText,
    card: "from-pink-50 to-rose-50 ring-pink-100", icon: "bg-pink-500", link: "text-pink-700" },
] as const;

const STEPS = [
  { n: "1", title: "Create an account", desc: "Sign up in seconds — all you need is an email.", art: "/illustrations/step-signup.svg", tint: "bg-teal-50", badge: "bg-teal-600" },
  { n: "2", title: "Find your provider", desc: "Browse licence-checked clinicians, see their fees and pick an open time.", art: "/illustrations/step-find.svg", tint: "bg-violet-50", badge: "bg-violet-500" },
  { n: "3", title: "Pay, then see your doctor", desc: "Pay with M-Pesa, then join a private video call at your time.", art: "/illustrations/step-pay.svg", tint: "bg-amber-50", badge: "bg-amber-500" },
];

const WHY = [
  { Icon: BadgeCheck, title: "Licence-checked clinicians", desc: "Every provider submits their practice licence for review before they appear.", tone: "bg-teal-50 text-teal-700" },
  { Icon: Lock, title: "Private by design", desc: "Your records are yours. You choose who else can see them.", tone: "bg-violet-50 text-violet-700" },
  { Icon: Smartphone, title: "Pay with M-Pesa", desc: "Fees shown upfront. No cards, no surprises.", tone: "bg-amber-50 text-amber-700" },
  { Icon: FileText, title: "Documents you can use", desc: "Sick-off sheets, medical reports and forms, signed by a clinician.", tone: "bg-pink-50 text-pink-700" },
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

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-orange-50">
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(13,148,136,.12)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="animate-blob pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="animate-blob pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl delay-200" />
        <div className="animate-blob pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl delay-300" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-20 lg:pt-20">
          <div className="text-center lg:text-left">
            <span className="animate-fade-in inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-teal-800 shadow-sm ring-1 ring-teal-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Kenya&apos;s telehealth platform
            </span>
            <h1 className="animate-slide-up mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
              Quality care,{" "}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-sky-500 bg-clip-text text-transparent">made accessible.</span>
            </h1>
            <p className="animate-slide-up delay-100 mx-auto mt-6 max-w-xl text-base text-slate-600 sm:text-lg lg:mx-0">
              See a licence-checked doctor by video, get your medicines delivered and book care at
              home — all paid for with M-Pesa, all in one place.
            </p>
            <div className="animate-slide-up delay-200 mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/providers" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:-translate-y-0.5 hover:bg-teal-700">
                Find a provider <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pharmacy" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-teal-200">
                <Pill className="h-4 w-4 text-[#f97366]" /> Shop the pharmacy
              </Link>
            </div>
            <div className="animate-fade-in delay-300 mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Licence-checked</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> Private video calls</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-teal-600" /> M-Pesa</span>
            </div>
          </div>

          <div className="animate-fade-in delay-200 relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[5/4] rounded-[2.5rem] bg-white/70 p-4 shadow-2xl shadow-teal-900/10 ring-1 ring-white backdrop-blur sm:p-8">
              <div className="absolute inset-4 rounded-[2rem] bg-gradient-to-br from-teal-100/70 via-white to-sky-100/70 sm:inset-6" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/hero-care.svg" alt="Illustration of two doctors beside a heartbeat symbol" fetchPriority="high" className="relative h-full w-full object-contain" />
            </div>
            <div className="float-slow absolute -left-2 top-8 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 sm:flex" style={{ ["--r" as string]: "-3deg" }}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
              <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">M-Pesa</div><div className="text-sm font-extrabold text-slate-900">Payment received</div></div>
            </div>
            <div className="float-slow d2 absolute -right-2 top-1/2 hidden items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 sm:flex" style={{ ["--r" as string]: "3deg" }}>
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Video className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" /></span>
              <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">Doctor</div><div className="text-sm font-extrabold text-slate-900">Available now</div></div>
            </div>
            <div className="float-slow d3 absolute -bottom-4 left-8 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100" style={{ ["--r" as string]: "-2deg" }}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-[#f97366]"><Pill className="h-5 w-5" /></span>
              <div className="leading-tight"><div className="text-[11px] font-semibold text-slate-400">Pharmacy</div><div className="text-sm font-extrabold text-slate-900">Delivered to your door</div></div>
            </div>
          </div>
        </div>

        {/* Trust strip — claims that are true at any size and stay true as the platform grows. */}
        <div className="relative mx-auto max-w-6xl px-4 pb-14">
          <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white/80 p-3 shadow-xl shadow-slate-900/5 ring-1 ring-slate-100 backdrop-blur md:grid-cols-4">
            {[
              { Icon: BadgeCheck, k: "Licensed", v: "Every provider checked", c: "bg-teal-50 text-teal-700" },
              { Icon: MapPin, k: "Nationwide", v: "Video consultations", c: "bg-violet-50 text-violet-700" },
              { Icon: Clock, k: "24/7", v: "Ambulance line", c: "bg-rose-50 text-rose-600" },
              { Icon: Smartphone, k: "M-Pesa", v: "Pay in seconds", c: "bg-amber-50 text-amber-700" },
            ].map(({ Icon, k, v, c }) => (
              <div key={k} className="flex items-center gap-3 rounded-2xl p-2 sm:p-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${c}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 leading-tight"><div className="font-extrabold text-slate-900">{k}</div><div className="text-xs text-slate-500">{v}</div></div>
              </div>
            ))}
          </div>
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
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Everything your family needs</h2>
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
            <p className="text-sm font-bold uppercase tracking-widest text-violet-600">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Care in three simple steps</h2>
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
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/60 via-white to-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-orange-100 via-rose-50 to-amber-100">
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
              <p className="text-sm font-bold uppercase tracking-widest text-[#e05a4c]">Why Care Bora</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Care you can trust, for the whole family</h2>
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
            <p className="text-sm font-bold uppercase tracking-widest text-amber-600">Reviews</p>
            <h2 id="reviews" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">What patients say</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.map((r, i) => {
              const tone = ["bg-teal-50", "bg-violet-50", "bg-amber-50"][i % 3];
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
            <p className="text-sm font-bold uppercase tracking-widest text-sky-600">FAQ</p>
            <h2 id="faq" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Questions people ask</h2>
            <p className="mt-3 text-slate-500">
              More in <Link href="/online-doctor-kenya" className="font-semibold text-teal-700 hover:underline">how online consultations work</Link> and{" "}
              <Link href="/how-we-verify-providers" className="font-semibold text-teal-700 hover:underline">how we verify providers</Link>.
            </p>
            <div className="relative mt-6 hidden aspect-[4/3] overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-50 to-cyan-100 lg:block">
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
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-600 via-emerald-600 to-sky-600 px-6 py-12 sm:px-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="relative text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Ready to see a doctor?</h2>
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

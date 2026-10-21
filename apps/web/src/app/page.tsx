import type { Metadata } from "next";
import Link from "next/link";
import {
  Video, Users, Pill, HomeIcon, ShieldCheck, Smartphone,
  ArrowRight, Star, FileText, Stamp, Siren, Phone, UserPlus, Search, CreditCard, BadgeCheck,
} from "lucide-react";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema, faqSchema, HOME_FAQS } from "@/lib/structured-data";
import FaqList from "@/components/FaqList";
import Reveal from "@/components/Reveal";
import HeroPhone from "@/components/HeroPhone";
import PhotoWithFallback from "@/components/PhotoWithFallback";
import { reviewService, providerService, storefrontService } from "@carebora/core";

// Title and description come from the root layout's defaults, which are written
// for the homepage; this just pins its canonical.
export const metadata: Metadata = { alternates: { canonical: "/" } };

const FEATURES = [
  { Icon: Video, title: "Teleconsultations", desc: "Secure video + chat with verified doctors and nurses.", href: "/online-doctor-kenya" },
  { Icon: Siren, title: "Emergency ambulance", desc: "Call our ambulance line directly, or send a request in the app and follow its status.", href: "/ambulance-nairobi" },
  { Icon: Stamp, title: "Medical forms & reports", desc: "Request a sick-off sheet, medical report or school, employment or insurance form — a licensed clinician reviews and signs it.", href: "/providers" },
  { Icon: FileText, title: "Treatment with sick-off sheet", desc: "Get treated online and receive a signed sick-off sheet (medical certificate) for work or school.", href: "/sick-off-sheet-online-kenya" },
  { Icon: Pill, title: "Pharmacy delivery", desc: "Order medication from the pharmacy nearest you, delivered to your door.", href: "/pharmacy" },
  { Icon: HomeIcon, title: "Home-based care", desc: "Request a nurse or physio to visit you at home.", href: "/home-visits-nairobi" },
  { Icon: Users, title: "Licence-checked providers", desc: "Every clinician submits their practice licence for review before they appear.", href: "/how-we-verify-providers" },
  { Icon: Smartphone, title: "M-Pesa payments", desc: "Pay for care instantly — no cards, no friction.", href: "/pharmacy" },
  { Icon: ShieldCheck, title: "Private & secure", desc: "Clinical records protected with strict access controls.", href: "/records" },
];

const STEPS = [
  { n: "01", title: "Create an account", desc: "Sign up in seconds as a patient." },
  { n: "02", title: "Find your provider", desc: "Browse licence-checked clinicians and pick an open time." },
  { n: "03", title: "Pay, then see your doctor", desc: "Pay the fee with M-Pesa, then join a private video call at your time." },
];

/** Refreshed every ten minutes: fresh enough for reviews, cheap to serve. */
export const revalidate = 600;

export default async function HomePage() {
  // Real reviews only. If there are none yet, the section is simply not shown —
  // an empty "what patients say" is honest; an invented one is not.
  let reviews: Awaited<ReturnType<typeof reviewService.featured>> = [];
  try {
    reviews = await reviewService.featured(3);
  } catch {
    reviews = [];
  }

  // Real photos only: the providers who are listed (and their uploaded photos),
  // and products that have a photo. Each strip is hidden when there is nothing to show.
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

  return (
    <div>
      {/* Tells search engines what this business is, where it operates and what
          it offers — the basis for rich results and health/local-intent matching. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={faqSchema()} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/30 blur-3xl" />
          <div className="animate-blob absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl delay-200" />
        </div>

        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="text-center lg:text-left">
              <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-teal-100 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                Kenya&apos;s telehealth platform
              </span>
              <h1 className="animate-slide-up mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Quality care, <span className="gradient-text">made accessible.</span>
              </h1>
              <p className="animate-slide-up delay-100 mx-auto mt-6 max-w-xl text-lg text-teal-100/90 lg:mx-0">
                Consult verified doctors and nurses, book home visits, and order from the
                pharmacy — all paid for with M-Pesa, all in one place.
              </p>
              <div className="animate-slide-up delay-200 mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link href="/providers" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-teal-50">
                  Find a provider <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pharmacy" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                  Browse pharmacy
                </Link>
              </div>
            </div>
            <div className="animate-fade-in delay-200"><HeroPhone /></div>
          </div>

          {/* Stats */}
          <div className="animate-fade-in delay-300 mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Claims that are true at any size, and that stay true as the
                platform grows (counts and county numbers overstated reality). */}
            {[
              { k: "Licensed", v: "Every provider checked" },
              { k: "Nationwide", v: "Video consultations" },
              { k: "24/7", v: "Ambulance dispatch" },
              { k: "M-Pesa", v: "Instant payment" },
            ].map((s) => (
              <div key={s.v} className="tilt-on-hover rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
                <div className="text-2xl font-extrabold text-white">{s.k}</div>
                <div className="mt-1 text-xs text-teal-200">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency ambulance — deliberately the first thing after the hero, since
          someone arriving mid-emergency shouldn't have to scroll or sign in. */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-500/25">
            <Siren className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-rose-900">Medical emergency? An ambulance is ready.</h2>
            <p className="mt-1 text-sm text-rose-700">
              Call our ambulance line now — or send a request in the app and follow its status.
            </p>
          </div>
          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <a
              href={`tel:${AMBULANCE_PHONE}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-700 sm:flex-none"
            >
              <Phone className="h-4 w-4" /> Call {AMBULANCE_PHONE_DISPLAY}
            </a>
            <Link
              href="/ambulance"
              className="flex flex-1 items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 sm:flex-none"
            >
              Request
            </Link>
          </div>
        </div>
      </section>

      {/* Real providers, with the photos they uploaded. Hidden until there are some. */}
      {doctors.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-20" aria-labelledby="meet">
          <Reveal className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="meet" className="text-3xl font-extrabold tracking-tight text-slate-900">Meet our providers</h2>
              <p className="mt-2 text-slate-500">Licence-checked clinicians you can see from your phone.</p>
            </div>
            <Link href="/providers" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">See everyone <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {doctors.slice(0, 8).map((d, i) => (
              <Reveal key={d.userId} delay={(i % 4) * 80}>
                <Link href={`/providers/${d.userId}`} className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-xl hover:shadow-teal-900/10">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-teal-100 to-emerald-100">
                    <PhotoWithFallback src={d.user.avatarUrl!} name={d.user.fullName} className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                    <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow ${d.isAvailable ? "text-emerald-700" : "text-amber-700"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${d.isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} /> {d.isAvailable ? "Available" : "Busy"}
                    </span>
                    <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-teal-700 shadow"><BadgeCheck className="h-4 w-4" /></span>
                  </div>
                  <div className="p-4">
                    <div className="truncate font-bold text-slate-900">{d.user.fullName}</div>
                    <div className="truncate text-sm text-teal-700">{d.specialty ?? "Clinician"}</div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* The pharmacy, as it looks: a slow strip of real product photos. */}
      {products.length >= 6 && (
        <section className="mt-20 overflow-hidden border-y border-slate-200 bg-white py-10" aria-label="From the pharmacy">
          <Reveal className="mx-auto mb-6 flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">From the pharmacy</h2>
              <p className="mt-1 text-sm text-slate-500">Everyday medicines, delivered to your door.</p>
            </div>
            <Link href="/pharmacy" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">Shop now <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
          <div className="marquee">
            <div className="marquee-track gap-4 px-2">
              {[...products, ...products].map((p, i) => (
                <Link key={`${p.drugId}-${i}`} href="/pharmacy" aria-hidden={i >= products.length} tabIndex={i >= products.length ? -1 : 0}
                  className="group w-44 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="aspect-square bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl!} alt={p.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-3"><div className="truncate text-sm font-semibold text-slate-900">{p.name}</div></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Everything your family needs</h2>
          <p className="mt-3 text-slate-500">One platform for consultations, care, and medication.</p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc, href }, i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
            <Link href={href} className="card-lift group relative block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
              <Icon className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-teal-500/[0.06] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
              <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 transition-transform group-hover:translate-x-0.5">
                Explore <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Care in three steps</h2>
            <p className="mt-3 text-slate-500">From sign-up to your consultation in a few minutes.</p>
          </Reveal>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3">
            <svg className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-2 w-[68%] md:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
              <line x1="0" y1="1" x2="100" y2="1" stroke="#5eead4" strokeWidth="0.6" className="step-line" vectorEffect="non-scaling-stroke" />
            </svg>
            {[
              { ...STEPS[0]!, Icon: UserPlus },
              { ...STEPS[1]!, Icon: Search },
              { ...STEPS[2]!, Icon: CreditCard },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 140}>
                <div className="relative text-center">
                  <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30">
                    <s.Icon className="h-7 w-7" />
                    <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-teal-700 shadow ring-1 ring-teal-100">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What patients say — only real reviews from completed appointments. */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="reviews">
          <div className="text-center">
            <h2 id="reviews" className="text-3xl font-extrabold tracking-tight text-slate-900">What patients say</h2>
            <p className="mt-3 text-slate-500">Reviews from patients after a completed appointment.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card-lift rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                  ))}
                </div>
                <blockquote className="mt-3 text-slate-600">“{r.comment}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-slate-900">{r.reviewer}</span>
                  <Link href={`/providers/${r.providerId}`} className="block text-slate-500 hover:text-teal-700 hover:underline">
                    about {r.providerName}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ — the same list that is emitted as FAQPage markup above, so what a
          search engine is told is exactly what a visitor can read. */}
      <section className="mx-auto max-w-3xl px-4 py-20" aria-labelledby="faq">
        <div className="text-center">
          <h2 id="faq" className="text-3xl font-extrabold tracking-tight text-slate-900">Questions people ask</h2>
          <p className="mt-3 text-slate-500">
            More in <Link href="/online-doctor-kenya" className="font-semibold text-teal-700 hover:underline">how online consultations work</Link> and{" "}
            <Link href="/how-we-verify-providers" className="font-semibold text-teal-700 hover:underline">how we verify providers</Link>.
          </p>
        </div>
        <FaqList faqs={HOME_FAQS} className="mt-10" />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-700 px-8 py-14 text-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-3xl font-extrabold text-white">Ready to see a doctor?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-teal-50">
            Join CareBora and get quality care from anywhere in Kenya.
          </p>
          <Link href="/login" className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-800 transition hover:-translate-y-0.5">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

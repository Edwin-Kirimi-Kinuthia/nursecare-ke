import type { Metadata } from "next";
import Link from "next/link";
import {
  Video, Users, Pill, HomeIcon, ShieldCheck, Smartphone,
  ArrowRight, Star, FileText, Baby, Plane, Stamp, Siren, Phone,
} from "lucide-react";
import { AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY } from "@/lib/contact";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema, faqSchema } from "@/lib/structured-data";

// Title and description come from the root layout's defaults, which are written
// for the homepage; this just pins its canonical.
export const metadata: Metadata = { alternates: { canonical: "/" } };

const FEATURES = [
  { Icon: Video, title: "Teleconsultations", desc: "Secure video + chat with verified doctors and nurses.", href: "/providers" },
  { Icon: Siren, title: "Emergency ambulance", desc: "An ambulance ready when you need one — call us directly or request dispatch in-app, and we send the nearest crew.", href: "/ambulance" },
  { Icon: Plane, title: "Travel & vaccination certificates", desc: "Yellow fever certificates required for travel, plus fitness-to-fly and other clearances asked for at airports and embassies.", href: "/providers" },
  { Icon: Stamp, title: "Medical forms filled & stamped", desc: "School admission, employment and insurance forms completed, signed and stamped by verified clinicians.", href: "/providers" },
  { Icon: FileText, title: "Treatment with sick-off sheet", desc: "Get treated online and receive a signed sick-off sheet (medical certificate) for work or school.", href: "/providers" },
  { Icon: Baby, title: "Pregnancy crisis management", desc: "Urgent OB-GYN support and pregnancy crisis management, any time — from bleeding to severe symptoms.", href: "/providers" },
  { Icon: Pill, title: "Pharmacy delivery", desc: "Order medication from the pharmacy nearest you, delivered to your door.", href: "/pharmacy" },
  { Icon: HomeIcon, title: "Home-based care", desc: "Request a nurse or physio to visit you at home.", href: "/home-visits" },
  { Icon: Users, title: "Verified providers", desc: "Browse clinicians vetted against Kenyan licensing bodies.", href: "/providers" },
  { Icon: Smartphone, title: "M-Pesa payments", desc: "Pay for care instantly — no cards, no friction.", href: "/pharmacy" },
  { Icon: ShieldCheck, title: "Private & secure", desc: "Clinical records protected with strict access controls.", href: "/records" },
];

const STEPS = [
  { n: "01", title: "Create an account", desc: "Sign up in seconds as a patient." },
  { n: "02", title: "Find your provider", desc: "Filter by specialty and pick an open slot." },
  { n: "03", title: "Get care & pay", desc: "Consult, get a prescription, pay with M-Pesa." },
];

const REVIEWS = [
  { name: "Wanjiru K.", text: "Booked a doctor in minutes and got my prescription the same evening. Incredible.", stars: 5 },
  { name: "Brian O.", text: "The home-visit nurse was professional and on time. CareBora is a game-changer.", stars: 5 },
  { name: "Aisha M.", text: "Ordered my mum's medication and it arrived next day. So convenient.", stars: 4 },
];

export default function HomePage() {
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

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-teal-100 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
              Kenya&apos;s telehealth platform
            </span>
            <h1 className="animate-slide-up mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Quality care, <span className="gradient-text">made accessible.</span>
            </h1>
            <p className="animate-slide-up delay-100 mx-auto mt-6 max-w-2xl text-lg text-teal-100/90">
              Consult verified doctors and nurses, book home visits, and order from the
              pharmacy — all paid for with M-Pesa, all in one place.
            </p>
            <div className="animate-slide-up delay-200 mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/providers" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-teal-900 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-teal-50">
                Find a provider <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pharmacy" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                Browse pharmacy
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="animate-fade-in delay-300 mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Claims that hold at any size. These were counts ("5+ verified
                providers", "15 pharmacy products") that overstated the real
                figures and would have needed editing every week besides —
                a bad trade on a health platform, where the thing being sold
                is trust. */}
            {[
              { k: "Licensed", v: "Every provider checked" },
              { k: "47", v: "Counties served" },
              { k: "24/7", v: "Ambulance dispatch" },
              { k: "M-Pesa", v: "Instant payment" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur">
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
              Call us now and we&apos;ll dispatch the nearest crew — or request one in-app and track it to your door.
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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Everything your family needs</h2>
          <p className="mt-3 text-slate-500">One platform for consultations, care, and medication.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc, href }) => (
            <Link key={title} href={href} className="card-lift group rounded-2xl border border-slate-200 bg-white p-6">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 transition-transform group-hover:translate-x-0.5">
                Explore <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Care in three steps</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-7">
                <div className="text-5xl font-black text-teal-100">{s.n}</div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Loved by patients</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="card-lift rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                ))}
              </div>
              <p className="mt-3 text-slate-600">“{r.text}”</p>
              <div className="mt-4 text-sm font-semibold text-slate-900">{r.name}</div>
            </div>
          ))}
        </div>
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

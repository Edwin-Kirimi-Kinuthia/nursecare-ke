import Link from "next/link";
import HealthBadge from "@/components/HealthBadge";

const services = [
  {
    title: "Teleconsultations",
    desc: "Video and chat consults with verified doctors and clinical officers.",
    href: "/consultations",
    icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    title: "Find Providers",
    desc: "Browse and book verified doctors, nurses, and physiotherapists near you.",
    href: "/providers",
    icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z",
  },
  {
    title: "Home-Based Care",
    desc: "Request a nurse or physio to visit you at home for hands-on care.",
    href: "/services",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    title: "Pharmacy Shop",
    desc: "Order medication and supplies, delivered to your doorstep.",
    href: "/services",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    title: "M-Pesa Payments",
    desc: "Pay for consults, visits, and medication instantly via M-Pesa.",
    href: "/services",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  {
    title: "Emergency",
    desc: "Fast access to urgent home medical response, day or night.",
    href: "/emergency",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative flex items-center overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-teal-700/30 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-700/30 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 py-28 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-teal-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-teal-300" />
            Kenya&apos;s telehealth platform
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-6xl">
            Quality care,
            <br />
            <span className="text-teal-300">made accessible.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-teal-50/80">
            Consult verified doctors over video, request a nurse to your home,
            order medication, and pay with M-Pesa — all from one app. Afya bora,
            popote ulipo.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="w-full rounded-xl bg-teal-500 px-8 py-3.5 font-semibold text-white shadow-lg transition-colors hover:bg-teal-400 sm:w-auto"
            >
              Get started free
            </Link>
            <Link
              href="/providers"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 sm:w-auto"
            >
              Browse providers
            </Link>
          </div>

          <div className="mt-10 flex justify-center">
            <HealthBadge />
          </div>
        </div>
      </section>

      {/* ── SERVICES ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Everything your health needs, in one place
          </h2>
          <p className="mt-3 text-slate-600">
            One platform connecting you to care — from your phone or your living room.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="group rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-700 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to feel better?</h2>
          <p className="mx-auto mt-3 max-w-xl text-teal-50/90">
            Create your free CareBora account and book your first consultation in minutes.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 font-semibold text-teal-700 shadow-lg transition-transform hover:scale-105"
          >
            Create free account
          </Link>
        </div>
      </section>
    </>
  );
}

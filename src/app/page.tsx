import Link from "next/link";
import ProviderCard from "@/components/ProviderCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import { providers, testimonials } from "@/lib/data";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function HomePage() {
  const featured = providers.slice(0, 6);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 overflow-hidden pt-16">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-700/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-700/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-800/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-blue-800/50 border border-blue-700/60 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-blue-200 text-sm font-medium">500+ Verified Healthcare Professionals</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.15] tracking-tight mb-6">
              Professional Healthcare<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                at Your Doorstep
              </span>
            </h1>

            <p className="text-blue-100/80 text-lg leading-relaxed mb-10 max-w-lg">
              Connect with verified nurses and healthcare professionals for home-based care, nursing services, and 24/7 emergency response across Kenya.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href="/providers"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 hover:bg-blue-50 font-bold px-8 py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find a Nurse
              </Link>
              <Link
                href="/emergency"
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-0.5 emergency-pulse text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Emergency Help
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-blue-800/50">
              {[
                { value: "500+", label: "Verified Nurses" },
                { value: "10K+", label: "Patients Served" },
                { value: "4.9★", label: "Avg Rating" },
                { value: "24/7", label: "Emergency" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-blue-400 text-xs font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Floating UI mockup */}
          <div className="relative hidden lg:flex justify-center animate-float">
            {/* Main provider card */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-[340px]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Rated Provider</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">● Available Now</span>
              </div>

              <div className="flex items-start gap-4 mb-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center text-white font-bold text-xl">GW</div>
                  <div className="absolute -bottom-1.5 -right-1.5">
                    <VerifiedBadge size="sm" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-lg">Grace Wanjiku</h3>
                  </div>
                  <p className="text-slate-500 text-sm">Home Care Specialist</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">4.9 (127 reviews)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {["Home Care", "Wound Care", "Elderly Care"].map(t => (
                  <span key={t} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Westlands, Nairobi
                </span>
                <span>8 yrs exp.</span>
                <span className="text-green-600 font-medium">&lt; 1 hr response</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <p className="text-slate-400 text-xs">Starting from</p>
                  <p className="font-bold text-slate-900 text-lg">KES 1,500<span className="text-slate-400 font-normal text-sm">/hr</span></p>
                </div>
                <button className="bg-blue-600 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors">
                  Book Now
                </button>
              </div>
            </div>

            {/* Floating notification — top right */}
            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-3.5 flex items-center gap-3 border border-slate-100 w-52">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Booking Confirmed</p>
                <p className="text-xs text-slate-400">2 minutes ago</p>
              </div>
            </div>

            {/* Floating stat — bottom left */}
            <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-slate-100">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">Right now</p>
                <p className="font-bold text-slate-900">47 Nurses Online</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────── */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">What We Offer</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Comprehensive Healthcare Services</h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg">
              Whether you need daily home care, professional nursing, or urgent emergency assistance — our verified professionals are ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Home-Based Care",
                desc: "Compassionate daily assistance for patients recovering at home or needing ongoing support and supervision.",
                features: ["Bathing & Grooming", "Wound Care & Dressing", "Medication Reminders", "Mobility Assistance", "Nutritional Support"],
                price: "From KES 1,500/hr",
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
                bg: "bg-blue-50 hover:bg-blue-600",
                iconBg: "bg-blue-100 group-hover:bg-blue-500",
                iconColor: "text-blue-600 group-hover:text-white",
                textColor: "text-slate-600 group-hover:text-blue-100",
                headingColor: "text-slate-900 group-hover:text-white",
                checkColor: "text-blue-400 group-hover:text-blue-200",
                border: "border-blue-100 hover:border-blue-600",
                priceColor: "text-blue-600 group-hover:text-white",
                divider: "border-blue-100 group-hover:border-blue-500",
                shadow: "hover:shadow-blue-500/20",
              },
              {
                title: "Professional Nursing",
                desc: "Clinical nursing services delivered by Kenya Registered Nurses right at your home, without hospital visits.",
                features: ["IV Therapy & Injections", "Vital Signs Monitoring", "Post-Surgery Care", "Catheter Care", "Dressing Changes"],
                price: "From KES 2,000/hr",
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                bg: "bg-teal-50 hover:bg-teal-600",
                iconBg: "bg-teal-100 group-hover:bg-teal-500",
                iconColor: "text-teal-600 group-hover:text-white",
                textColor: "text-slate-600 group-hover:text-teal-100",
                headingColor: "text-slate-900 group-hover:text-white",
                checkColor: "text-teal-400 group-hover:text-teal-200",
                border: "border-teal-100 hover:border-teal-600",
                priceColor: "text-teal-600 group-hover:text-white",
                divider: "border-teal-100 group-hover:border-teal-500",
                shadow: "hover:shadow-teal-500/20",
              },
              {
                title: "Emergency Response",
                desc: "24/7 rapid medical emergency response. Our certified team is always on standby when you need us most.",
                features: ["24/7 Availability", "< 30 Min Response", "CPR & First Aid", "Trauma Care", "Hospital Coordination"],
                price: "From KES 2,500",
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                ),
                bg: "bg-red-50 hover:bg-red-600",
                iconBg: "bg-red-100 group-hover:bg-red-500",
                iconColor: "text-red-600 group-hover:text-white",
                textColor: "text-slate-600 group-hover:text-red-100",
                headingColor: "text-slate-900 group-hover:text-white",
                checkColor: "text-red-400 group-hover:text-red-200",
                border: "border-red-100 hover:border-red-600",
                priceColor: "text-red-600 group-hover:text-white",
                divider: "border-red-100 group-hover:border-red-500",
                shadow: "hover:shadow-red-500/20",
              },
            ].map((svc) => (
              <div
                key={svc.title}
                className={`group ${svc.bg} rounded-3xl p-8 transition-all duration-300 cursor-pointer border ${svc.border} hover:shadow-2xl ${svc.shadow}`}
              >
                <div className={`w-14 h-14 ${svc.iconBg} rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300`}>
                  <div className={`${svc.iconColor} transition-colors duration-300`}>{svc.icon}</div>
                </div>
                <h3 className={`text-xl font-bold ${svc.headingColor} mb-3 transition-colors duration-300`}>{svc.title}</h3>
                <p className={`text-sm leading-relaxed ${svc.textColor} mb-5 transition-colors duration-300`}>{svc.desc}</p>
                <ul className="space-y-2">
                  {svc.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${svc.textColor} transition-colors duration-300`}>
                      <CheckIcon className={`w-4 h-4 flex-shrink-0 ${svc.checkColor} transition-colors duration-300`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={`mt-6 pt-5 border-t ${svc.divider} transition-colors duration-300`}>
                  <span className={`${svc.priceColor} font-bold text-sm transition-colors duration-300`}>{svc.price} →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Simple Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Get Care in 4 Simple Steps</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">From search to care at your doorstep — the entire process takes just minutes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connector line on large screens */}
            <div className="hidden lg:block absolute top-10 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-0.5 bg-blue-100 z-0" />

            {[
              {
                step: "01",
                title: "Create Your Account",
                desc: "Sign up in under 2 minutes. Tell us your name, location, and what care you need.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Search & Filter",
                desc: "Browse verified providers by specialty, location, rating, and price. Read reviews from real patients.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Book Your Nurse",
                desc: "Pick your date and time. Chat with the provider, confirm the details, and pay securely online.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                step: "04",
                title: "Receive Care at Home",
                desc: "Your verified nurse arrives at your door. Track them live. Rate your experience after.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-md border border-blue-100 flex items-center justify-center text-blue-600 mb-5">
                  {item.icon}
                </div>
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold lg:top-auto lg:bottom-auto lg:-translate-y-0" />
                <span className="text-blue-600 text-sm font-bold mb-2">{item.step}</span>
                <h3 className="font-bold text-slate-900 text-base mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Get Started Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURED PROVIDERS ───────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Our Team</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Meet Our Verified Professionals</h2>
              <p className="text-slate-500 mt-2 max-w-lg">Every provider on NurseCare Kenya is identity-verified and credential-checked before joining.</p>
            </div>
            <Link href="/providers" className="flex-shrink-0 inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-sm">
              View all providers
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Patient Stories</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Our Patients Say</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Thousands of Kenyans trust NurseCare for their home healthcare needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">&ldquo;{t.comment}&rdquo;</p>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs">{t.service} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVIDER CTA ─────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block bg-blue-900/50 border border-blue-800 text-blue-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">For Healthcare Professionals</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Join Kenya&apos;s Largest Network of Home Healthcare Professionals
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Build your practice, set your own schedule, and earn more — all while making a real difference in patients&apos; lives.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {[
                  { label: "Flexible Scheduling", desc: "Work the hours that suit you" },
                  { label: "Competitive Earnings", desc: "Set your own rates" },
                  { label: "Verified Status", desc: "Get the trusted badge" },
                  { label: "Growing Patient Base", desc: "10,000+ active patients" },
                ].map((b) => (
                  <div key={b.label} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{b.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/auth/signup" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl hover:-translate-y-0.5">
                Apply to Join
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Stats card grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Average Monthly Earnings", value: "KES 85,000+", icon: "💰", bg: "bg-blue-900/40 border-blue-800" },
                { label: "Verified Providers", value: "487 Active", icon: "✓", bg: "bg-teal-900/40 border-teal-800" },
                { label: "Patient Satisfaction", value: "4.9 / 5.0", icon: "★", bg: "bg-purple-900/40 border-purple-800" },
                { label: "Avg. Response Time", value: "< 1 Hour", icon: "⚡", bg: "bg-orange-900/40 border-orange-800" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} border rounded-2xl p-6`}>
                  <div className="text-2xl mb-3">{s.icon}</div>
                  <p className="text-white font-bold text-xl">{s.value}</p>
                  <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── EMERGENCY BANNER ─────────────────────────────────────────── */}
      <section className="py-10 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 emergency-pulse">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Medical Emergency? Don&apos;t Wait.</p>
              <p className="text-red-200 text-sm">Our emergency response team is on standby 24/7. Average arrival time: 28 minutes.</p>
            </div>
          </div>
          <Link href="/emergency" className="flex-shrink-0 bg-white hover:bg-red-50 text-red-600 font-bold px-8 py-3.5 rounded-xl transition-colors shadow-lg">
            Request Emergency Help Now
          </Link>
        </div>
      </section>
    </>
  );
}

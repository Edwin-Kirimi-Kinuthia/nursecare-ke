import Link from "next/link";
import { providers } from "@/lib/data";
import VerifiedBadge from "@/components/VerifiedBadge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProviderProfilePage({ params }: Props) {
  const { id } = await params;
  const provider = providers.find((p) => p.id === id);

  if (!provider) {
    return (
      <div className="pt-32 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Provider not found</h1>
        <Link href="/providers" className="text-blue-600 mt-4 inline-block">← Back to providers</Link>
      </div>
    );
  }

  return (
    <div className="pt-16 bg-slate-50 min-h-screen">
      {/* Header banner */}
      <div className="bg-gradient-to-br from-blue-950 to-blue-900 pt-12 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/providers" className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white text-sm font-medium transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Providers
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Profile card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-5">
                <div className={`w-28 h-28 rounded-3xl ${provider.color} flex items-center justify-center text-white font-bold text-4xl mx-auto`}>
                  {provider.initials}
                </div>
                {provider.verified && (
                  <div className="absolute -bottom-2 -right-2">
                    <VerifiedBadge size="lg" />
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-1">{provider.name}</h1>
              <p className="text-slate-500 font-medium mb-3">{provider.specialty}</p>

              {provider.verified && (
                <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <VerifiedBadge size="xs" />
                  Verified Healthcare Professional
                </div>
              )}

              {/* Rating */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className={`w-5 h-5 ${i <= Math.round(provider.rating) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="font-bold text-slate-900">{provider.rating}</span>
                <span className="text-slate-400 text-sm">({provider.reviews} reviews)</span>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-3 mb-6 pt-4 border-t border-slate-100">
                {[
                  { label: "Experience", value: `${provider.experience}yr` },
                  { label: "Response", value: provider.responseTime },
                  { label: "Rate", value: `KES ${(provider.rate/1000).toFixed(1)}K` },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-bold text-slate-900 text-sm">{s.value}</p>
                    <p className="text-slate-400 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Availability */}
              <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl mb-6 ${provider.available ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                <span className={`w-2 h-2 rounded-full ${provider.available ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                <span className="text-sm font-semibold">{provider.available ? "Available Now" : "Currently Busy"}</span>
              </div>

              <Link
                href="/auth/signup"
                className={`w-full inline-flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-sm transition-all shadow-lg hover:-translate-y-0.5 ${provider.available ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed pointer-events-none"}`}
              >
                {provider.available ? "Book This Nurse" : "Join Waitlist"}
              </Link>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Location & Contact</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {provider.location}
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Response within {provider.responseTime}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-4">About {provider.name.split(" ")[0]}</h2>
              <p className="text-slate-600 leading-relaxed">{provider.bio}</p>
            </div>

            {/* Qualifications */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-5">Qualifications & Certifications</h2>
              <div className="space-y-3">
                {provider.qualifications.map((q) => (
                  <div key={q} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <span className="text-slate-700 font-medium text-sm">{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services offered */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-5">Services Offered</h2>
              <div className="flex flex-wrap gap-3">
                {provider.services.map((s) => (
                  <span key={s} className="bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-2 rounded-xl border border-blue-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white">
              <h2 className="font-bold text-xl mb-6">Pricing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
                  <p className="text-blue-200 text-sm mb-1">Hourly Rate</p>
                  <p className="text-3xl font-bold">KES {provider.rate.toLocaleString()}</p>
                  <p className="text-blue-200 text-xs mt-1">Minimum 2 hours</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
                  <p className="text-blue-200 text-sm mb-1">Full Day (8 hrs)</p>
                  <p className="text-3xl font-bold">KES {(provider.rate * 8 * 0.85).toLocaleString()}</p>
                  <p className="text-blue-200 text-xs mt-1">15% daily discount</p>
                </div>
              </div>
              <Link
                href="/auth/signup"
                className="w-full inline-flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold py-4 rounded-2xl text-sm transition-colors"
              >
                Book Now — Confirm in 60 Seconds
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

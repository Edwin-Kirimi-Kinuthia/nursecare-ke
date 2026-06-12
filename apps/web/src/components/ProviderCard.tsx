import Link from "next/link";
import VerifiedBadge from "./VerifiedBadge";
import { Provider } from "@/lib/data";

interface ProviderCardProps {
  provider: Provider;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? "text-amber-400" : "text-slate-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div
              className={`w-14 h-14 rounded-xl ${provider.color} flex items-center justify-center text-white font-bold text-lg`}
            >
              {provider.initials}
            </div>
            {provider.verified && (
              <div className="absolute -bottom-1 -right-1">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">{provider.name}</h3>
                <p className="text-slate-500 text-sm mt-0.5">{provider.specialty}</p>
              </div>
              <span
                className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  provider.available
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {provider.available ? "Available" : "Busy"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <StarRating rating={provider.rating} />
              <span className="text-slate-700 text-xs font-semibold">{provider.rating}</span>
              <span className="text-slate-400 text-xs">({provider.reviews})</span>
            </div>
          </div>
        </div>

        {/* Location & Experience */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {provider.location}
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {provider.experience} yrs exp.
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {provider.responseTime}
          </div>
        </div>

        {/* Service tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {provider.services.map((service) => (
            <span
              key={service}
              className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium"
            >
              {service}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <p className="text-slate-400 text-xs">Starting from</p>
            <p className="font-bold text-slate-900">
              KES {provider.rate.toLocaleString()}
              <span className="text-slate-400 font-normal text-xs">/hr</span>
            </p>
          </div>
          <Link
            href={`/providers/${provider.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { MapPin, BadgeCheck, ArrowRight } from "lucide-react";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { kes } from "@/lib/api";
import Stars from "@/components/Stars";
import AvailabilityBadge from "@/components/AvailabilityBadge";
import { nameInitial } from "@carebora/shared";

export default function ProviderCard({ p }: { p: ProviderPublicProfile }) {
  const location = [p.town, p.county].filter(Boolean).join(", ") || "Kenya";
  const verified = p.verificationStatus === "verified";

  return (
    <Link
      href={`/providers/${p.userId}`}
      className="card-lift group block overflow-hidden rounded-xl border border-teal-200 bg-[#f9fbf5]"
    >
      {/* Banner */}
      <div className="relative h-24 overflow-hidden bg-[#c8d9bd]">
        <div className="absolute -bottom-16 -left-8 h-28 w-[75%] rotate-[-8deg] rounded-[50%] bg-[#9db78d]" />
        <div className="absolute -bottom-20 right-[-10%] h-32 w-[90%] rotate-[6deg] rounded-[50%] bg-[#7f9d72]" />
        {verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-teal-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative z-10 px-5">
        {p.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.user.avatarUrl}
            alt={p.user.fullName}
            width={72}
            height={72}
            className="-mt-10 h-[72px] w-[72px] rounded-lg border-4 border-[#f9fbf5] bg-white object-cover object-top shadow-sm"
          />
        ) : (
          <div className="-mt-10 grid h-[72px] w-[72px] place-items-center rounded-lg border-4 border-[#f9fbf5] bg-teal-100 text-2xl font-medium text-teal-800 shadow-sm">
            {nameInitial(p.user.fullName)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-5 pt-3">
        <h3 className="text-lg font-medium text-slate-900">{p.user.fullName}</h3>
        <p className="text-sm text-teal-700">
          {p.specialty ?? "Clinician"}
          {p.subSpecialty && <span className="text-slate-400"> · {p.subSpecialty}</span>}
        </p>
        <AvailabilityBadge available={p.isAvailable} className="mt-1.5" />

        <div className="mt-2 flex items-center gap-2">
          <Stars value={p.ratingAvg} />
          <span className="text-xs text-slate-400">
            {p.ratingCount > 0 ? `${p.ratingAvg} · ${p.ratingCount} reviews` : "New"}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5" /> {location}
          {p.yearsExperience > 0 && <span className="text-slate-300">·</span>}
          {p.yearsExperience > 0 && <span>{p.yearsExperience} yrs</span>}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <div className="text-xs text-slate-400">Consultation</div>
            <div className="font-bold text-slate-900">{kes(p.consultationFeeKes)}</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-teal-700">
            Book <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

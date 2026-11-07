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
    <Link href={`/providers/${p.userId}`} className="card-lift group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        {p.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.user.avatarUrl} alt={p.user.fullName} width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover object-top" />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-slate-100 text-2xl font-medium text-slate-600" aria-hidden>{nameInitial(p.user.fullName)}</div>
        )}
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold leading-snug text-slate-900 group-hover:text-teal-700">{p.user.fullName}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.specialty ?? "Clinician"}{p.subSpecialty && <> · {p.subSpecialty}</>}</p>
          {verified && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-teal-700"><BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> Licence reviewed</p>}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /><span>{location}{p.yearsExperience > 0 && <> · {p.yearsExperience} years in practice</>}</span>
      </div>
      <AvailabilityBadge available={p.isAvailable} className="mt-3" />
      {p.ratingCount > 0 ? (
        <div className="mt-3 flex items-center gap-2"><Stars value={p.ratingAvg} /><span className="text-xs text-slate-500">{p.ratingAvg} ({p.ratingCount} reviews)</span></div>
      ) : <p className="mt-3 text-xs text-slate-500">No patient reviews yet</p>}

      <div className="mt-auto pt-5"><div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-4">
        <div><p className="text-xs text-slate-500">Video consultation</p><p className="mt-1 font-semibold text-slate-900">{p.consultationFeeKes ? kes(p.consultationFeeKes) : "Fee not listed"}</p></div>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-teal-700">View profile <ArrowRight className="h-4 w-4" aria-hidden /></span>
      </div></div>
    </Link>
  );
}

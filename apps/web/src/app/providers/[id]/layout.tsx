import type { Metadata } from "next";
import { providerService } from "@carebora/core";
import { NOINDEX, isIndexableProvider, tidy } from "@/lib/seo";

const ROLE_LABEL: Record<string, string> = {
  doctor: "Doctor",
  nurse: "Nurse",
  physio: "Physiotherapist",
  pharmacy: "Pharmacy",
};

/**
 * Per-provider title and description. These profile pages are public and are the
 * long-tail search entry points ("paediatrician in Mombasa"), so each one gets a
 * title naming the clinician, their specialty and their county rather than
 * inheriting a single generic site title.
 *
 * Providers who are unverified, or whose profile is still empty, are marked noindex.
 * for someone in search results before they've cleared licence review.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const p = await providerService.getById(id);
    const role = ROLE_LABEL[p.user.role] ?? "Provider";
    const name = tidy(p.user.fullName);
    const where = [tidy(p.town), tidy(p.county)].filter(Boolean).join(", ");
    const specialty = tidy(p.specialty) || role;

    // "Dr. Jane Kamau — Paediatrician in Nairobi": the name, then the thing and
    // the place someone would search for. The site's " · Care Bora Kenya" suffix
    // is added by the template, so this part is kept short enough to fit.
    const title = where ? `${name} — ${specialty} in ${where}` : `${name} — ${specialty}`;

    const bio = tidy(p.bio);
    const booking =
      `Book a video consultation with ${name}` +
      (p.consultationFeeKes ? ` from KES ${p.consultationFeeKes.toLocaleString("en-KE")}` : "") +
      " on Care Bora.";
    // A bio alone is often too short to be a useful snippet, and a snippet with
    // no call to action is a wasted one; lead with the bio, finish with the offer.
    const description = bio ? `${bio.length > 110 ? `${bio.slice(0, 107).trimEnd()}…` : bio} ${booking}` : booking;

    return {
      title,
      description,
      alternates: { canonical: `/providers/${id}` },
      ...(isIndexableProvider(p) ? {} : { robots: NOINDEX }),
      openGraph: {
        title: `${title} · Care Bora Kenya`,
        description,
        url: `/providers/${id}`,
        type: "profile",
        ...(p.user.avatarUrl && !p.user.avatarUrl.startsWith("data:")
          ? { images: [{ url: p.user.avatarUrl, alt: name }] }
          : {}),
      },
    };
  } catch {
    // Unknown id, or the database is unreachable — fall back to something safe
    // and keep it out of the index rather than emitting a broken entry.
    return { title: "Provider", robots: NOINDEX };
  }
}

export default function ProviderProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

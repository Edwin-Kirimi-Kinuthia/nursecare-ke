import type { Metadata } from "next";
import { providerService } from "@carebora/core";
import { NOINDEX } from "@/lib/seo";

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
 * Unverified providers are marked noindex — we don't want the platform vouching
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
    const name = p.user.fullName;
    const where = [p.town, p.county].filter(Boolean).join(", ");
    const specialty = p.specialty ?? role;

    const title = [name, specialty, where].filter(Boolean).join(" — ");
    const description =
      p.bio?.trim() ||
      `Book a video consultation or home visit with ${name}, a verified ${specialty.toLowerCase()} ` +
        `${where ? `in ${where}` : "in Kenya"} on CareBora.` +
        (p.consultationFeeKes ? ` Consultations from KES ${p.consultationFeeKes.toLocaleString("en-KE")}.` : "");

    const isVerified = p.verificationStatus === "verified";

    return {
      title,
      description,
      alternates: { canonical: `/providers/${id}` },
      ...(isVerified ? {} : { robots: NOINDEX }),
      openGraph: {
        title: `${title} · CareBora`,
        description,
        url: `/providers/${id}`,
        type: "profile",
        ...(p.user.avatarUrl ? { images: [{ url: p.user.avatarUrl, alt: name }] } : {}),
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

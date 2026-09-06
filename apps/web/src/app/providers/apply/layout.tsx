import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join CareBora as a doctor, nurse or physiotherapist",
  description:
    "Apply to offer teleconsultations and home visits on CareBora. Verified against Kenyan licensing bodies, set your own fees, and get paid via M-Pesa.",
  alternates: { canonical: "/providers/apply" },
  openGraph: {
    title: "Join CareBora as a verified clinician",
    description:
      "Offer teleconsultations and home visits, set your own fees, and get paid via M-Pesa.",
    url: "/providers/apply",
    type: "website",
  },
};

export default function ProviderApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

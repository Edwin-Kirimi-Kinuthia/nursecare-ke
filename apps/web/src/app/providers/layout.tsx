import type { Metadata } from "next";

// The page itself is a client component and so can't export metadata — it lives
// here instead. Nested routes (/providers/[id], /providers/apply) override it.
export const metadata: Metadata = {
  title: "Find Licensed Doctors in Kenya",
  description:
    "Browse licence-checked doctors and other clinicians in Kenya. See specialty, fees and patient reviews, then book a video consultation and pay with M-Pesa.",
  alternates: { canonical: "/providers" },
  openGraph: {
    title: "Find Licensed Doctors in Kenya · Care Bora Kenya",
    description:
      "Browse licence-checked doctors and other clinicians in Kenya. See specialty, fees and patient reviews, then book a video consultation and pay with M-Pesa.",
    url: "/providers",
    type: "website",
  },
};

export default function ProvidersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

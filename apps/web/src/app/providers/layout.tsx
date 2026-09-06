import type { Metadata } from "next";

// The page itself is a client component and so can't export metadata — it lives
// here instead. Nested routes (/providers/[id], /providers/apply) override it.
export const metadata: Metadata = {
  title: "Find verified doctors, nurses & physiotherapists in Kenya",
  description:
    "Browse doctors, nurses and physiotherapists vetted against Kenyan licensing bodies. Filter by specialty and county, see fees upfront, and book a video consultation or home visit.",
  alternates: { canonical: "/providers" },
  openGraph: {
    title: "Find verified doctors, nurses & physiotherapists in Kenya",
    description:
      "Clinicians vetted against Kenyan licensing bodies. Filter by specialty and county, see fees upfront, and book online.",
    url: "/providers",
    type: "website",
  },
};

export default function ProvidersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

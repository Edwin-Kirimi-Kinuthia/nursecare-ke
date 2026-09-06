import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell on CareBora — pharmacies, ambulance operators & labs",
  description:
    "Register your pharmacy, ambulance service or diagnostic laboratory on CareBora. Get your own dashboard, reach patients nearest to your branches, and get paid via M-Pesa.",
  alternates: { canonical: "/vendors/apply" },
  openGraph: {
    title: "Sell on CareBora — pharmacies, ambulance operators & labs",
    description:
      "List your pharmacy, ambulance service or lab. Your own dashboard, patients matched by proximity, M-Pesa settlement.",
    url: "/vendors/apply",
    type: "website",
  },
};

export default function VendorApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

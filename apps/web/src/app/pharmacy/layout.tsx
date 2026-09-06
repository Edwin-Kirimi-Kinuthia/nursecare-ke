import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online pharmacy Kenya — medication delivered from the pharmacy nearest you",
  description:
    "Order prescription and over-the-counter medication online in Kenya. CareBora matches you to the nearest licensed pharmacy stocking what you need and delivers to your door. Pay with M-Pesa.",
  alternates: { canonical: "/pharmacy" },
  openGraph: {
    title: "Online pharmacy Kenya — delivered from the pharmacy nearest you",
    description:
      "Prescription and over-the-counter medication from licensed Kenyan pharmacies, matched by distance and delivered to your door. Pay with M-Pesa.",
    url: "/pharmacy",
    type: "website",
  },
};

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

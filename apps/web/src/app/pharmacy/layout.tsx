import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online Pharmacy Kenya: Medicine Delivered",
  description:
    "Order medication online in Kenya from participating pharmacies, delivered to you. Prescription-only medicines need a valid prescription. Pay with M-Pesa.",
  alternates: { canonical: "/pharmacy" },
  openGraph: {
    title: "Online Pharmacy Kenya: Medicine Delivered · Care Bora Kenya",
    description:
      "Order medication online in Kenya from participating pharmacies, delivered to you. Prescription-only medicines need a valid prescription. Pay with M-Pesa.",
    url: "/pharmacy",
    type: "website",
  },
};

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

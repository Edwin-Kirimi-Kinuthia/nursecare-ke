import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact us — message Care Bora or request a medical document",
  description:
    "Message the Care Bora team about an appointment, a payment or a technical problem, or request a sick-off sheet, medical report, fit-to-work or school medical form.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

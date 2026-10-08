import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us: Message Care Bora",
  description:
    "Message the Care Bora team about an appointment, payment or technical problem, or request a sick-off sheet, medical report or school or insurance form.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

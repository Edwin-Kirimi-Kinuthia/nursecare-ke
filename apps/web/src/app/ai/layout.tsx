import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Symptom Checker for Kenya",
  description:
    "Describe your symptoms for guidance on how urgent they are and which clinician to see. Educational triage only: not a diagnosis or for emergencies.",
  alternates: { canonical: "/ai" },
  openGraph: {
    title: "Free Symptom Checker for Kenya · Care Bora Kenya",
    description:
      "Describe your symptoms for guidance on how urgent they are and which clinician to see. Educational triage only: not a diagnosis or for emergencies.",
    url: "/ai",
    type: "website",
  },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children;
}

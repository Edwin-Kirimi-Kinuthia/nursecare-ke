import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free symptom checker — find the right care in Kenya",
  description:
    "Describe your symptoms and get guidance on how urgent they are and which kind of clinician to see. Educational triage only — not a diagnosis, and not for emergencies.",
  alternates: { canonical: "/ai" },
  openGraph: {
    title: "Free symptom checker — find the right care in Kenya",
    description:
      "Describe your symptoms and get guidance on urgency and which clinician to see. Not a diagnosis.",
    url: "/ai",
    type: "website",
  },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children;
}

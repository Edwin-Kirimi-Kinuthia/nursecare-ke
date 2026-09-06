import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";

// Behind a login — a crawler only ever sees a redirect or an empty skeleton, so
// indexing this would spend crawl budget on a near-empty duplicate page.
export const metadata: Metadata = { title: "Your profile", robots: NOINDEX };

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

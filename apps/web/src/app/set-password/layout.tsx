import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Set your password", robots: NOINDEX };

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}

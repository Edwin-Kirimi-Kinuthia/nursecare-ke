import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Account settings", robots: NOINDEX };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

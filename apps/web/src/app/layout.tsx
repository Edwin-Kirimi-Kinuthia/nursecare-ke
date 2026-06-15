import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "CareBora API",
    template: "%s · CareBora",
  },
  description:
    "CareBora is Kenya's API-first telehealth platform: teleconsultations, verified providers, home-based care, a pharmacy marketplace, and M-Pesa payments.",
  applicationName: "CareBora",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}

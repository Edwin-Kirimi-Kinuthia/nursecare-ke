import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "CareBora — Quality Care, Made Accessible",
    template: "%s · CareBora",
  },
  description:
    "CareBora is Kenya's telehealth platform: remote consultations, verified doctors and nurses, home-based care, a pharmacy marketplace, and M-Pesa payments — all in one place.",
  keywords:
    "telehealth Kenya, online doctor Kenya, home nursing, M-Pesa healthcare, teleconsultation, pharmacy delivery Nairobi",
  applicationName: "CareBora",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "NurseCare Kenya — Professional Home Healthcare",
  description:
    "Connect with verified nurses and healthcare professionals for home-based care, nursing services, and 24/7 emergency response across Kenya.",
  keywords: "home nursing Kenya, home care Nairobi, emergency nurse, healthcare at home",
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

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "CareBora — Quality care, made accessible",
    template: "%s · CareBora",
  },
  description:
    "CareBora is Kenya's telehealth platform: teleconsultations, verified providers, home-based care, a pharmacy marketplace, and M-Pesa payments.",
  applicationName: "CareBora",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <Nav />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

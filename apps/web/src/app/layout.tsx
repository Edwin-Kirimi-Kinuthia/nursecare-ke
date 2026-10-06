import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { LocationProvider } from "@/components/LocationProvider";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  // Driven by NEXT_PUBLIC_APP_URL so canonicals and OG URLs follow the real
  // domain per environment instead of being pinned to one deploy's host.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Care Bora Kenya — Telehealth, ambulance & medical reports in Kenya",
    template: "%s · Care Bora Kenya",
  },
  description:
    "Kenya's telehealth platform: video consultations with verified doctors and nurses, 24/7 emergency ambulance, yellow fever and travel certificates, school and employment medical forms, home visits, lab tests and pharmacy delivery — paid with M-Pesa.",
  applicationName: SITE_NAME,
  keywords: [
    "telehealth Kenya", "online doctor Kenya", "yellow fever certificate Kenya",
    "medical certificate Kenya", "sick off sheet", "school medical form Kenya",
    "ambulance Nairobi", "home nursing care Kenya", "online pharmacy Kenya", "M-Pesa health",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // No canonical here on purpose: a value set on the root layout cascades to
  // every page that doesn't override it, which would have private pages
  // claiming the homepage as their canonical. Each page declares its own.
  category: "health",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the token from Google Search
  // Console to verify ownership and start getting indexing reports.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    title: "Care Bora Kenya — Quality care, made accessible",
    description:
      "Consult verified doctors and nurses by video, call an ambulance, get medical reports and certificates, book home visits, and order from the pharmacy nearest you — all paid with M-Pesa.",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Care Bora Kenya" }],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Care Bora Kenya — Quality care, made accessible",
    description: "Kenya's telehealth platform — verified care, ambulance, medical certificates, pharmacy delivery, M-Pesa.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <Nav />
              <EmailVerifyBanner />
              <main className="min-h-[calc(100vh-4rem)]">{children}</main>
              <Footer />
              <CartDrawer />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

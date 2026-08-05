import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { LocationProvider } from "@/components/LocationProvider";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://nursecare-ke-five.vercel.app"),
  title: {
    default: "Care Bora Kenya — Quality care, made accessible",
    template: "%s · Care Bora Kenya",
  },
  description:
    "Care Bora Kenya is Kenya's telehealth platform: teleconsultations, verified providers, home-based care, a pharmacy marketplace, and M-Pesa payments.",
  applicationName: "Care Bora Kenya",
  openGraph: {
    title: "Care Bora Kenya — Quality care, made accessible",
    description:
      "Consult verified doctors and nurses, book home visits, and order from the pharmacy — all paid for with M-Pesa.",
    url: "https://nursecare-ke-five.vercel.app",
    siteName: "Care Bora Kenya",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Care Bora Kenya" }],
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Care Bora Kenya — Quality care, made accessible",
    description: "Kenya's telehealth platform — verified care, home visits, pharmacy delivery, M-Pesa.",
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

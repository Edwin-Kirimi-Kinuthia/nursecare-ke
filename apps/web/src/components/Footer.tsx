"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";
import { EMERGENCY_PHONE, EMERGENCY_PHONE_DISPLAY } from "@/lib/contact";

export default function Footer() {
  const pathname = usePathname();
  // Hide on the full-screen video consultation page.
  if (pathname?.startsWith("/consultations/")) return null;

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 font-extrabold text-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="Care Bora Kenya" width={36} height={32} className="h-8 w-auto" />
            Care&nbsp;Bora
          </div>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            Kenya&apos;s telehealth platform — verified care, home visits, pharmacy delivery, and M-Pesa payments.
          </p>
          <div className="mt-4 flex gap-2">
            <a href="https://www.facebook.com/share/1GneyXiB15/" target="_blank" rel="noreferrer" aria-label="Facebook"
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-teal-600 hover:text-white">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://www.instagram.com/carebora_ke/" target="_blank" rel="noreferrer" aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-teal-600 hover:text-white">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Care */}
        <div className="space-y-2 text-sm">
          <div className="font-semibold text-slate-700">Care</div>
          <Link href="/providers" className="block text-slate-500 hover:text-teal-700">Find providers</Link>
          <Link href="/pharmacy" className="block text-slate-500 hover:text-teal-700">Pharmacy</Link>
          <Link href="/home-visits" className="block text-slate-500 hover:text-teal-700">Home visits</Link>
          <a href="/api/v1/docs" className="block text-slate-500 hover:text-teal-700">API docs</a>
        </div>

        {/* Contact */}
        <div className="space-y-3 text-sm sm:col-span-2">
          <div className="font-semibold text-slate-700">Contact</div>
          <a href={`tel:${EMERGENCY_PHONE}`} className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Phone className="h-4 w-4 shrink-0" /> {EMERGENCY_PHONE_DISPLAY}
          </a>
          <a href="tel:+254757963762" className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Phone className="h-4 w-4 shrink-0" /> +254 757 963 762
          </a>
          <a href="mailto:customercare@carebora.co.ke" className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Mail className="h-4 w-4 shrink-0" /> customercare@carebora.co.ke
          </a>
          <a href="mailto:admin@carebora.co.ke" className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Mail className="h-4 w-4 shrink-0" /> admin@carebora.co.ke
          </a>
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4 shrink-0" /> Nairobi, Kenya
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} Care Bora Kenya. All rights reserved. ·{" "}
          <Link href="/privacy" className="hover:text-teal-700 hover:underline">Privacy Policy</Link>
        </p>
        <p className="mt-1.5">
          Developed by{" "}
          <a
            href="https://edwin-kirimi-kinuthia.github.io/Edwin-Kirimi-Portfolio/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-teal-700 hover:underline"
          >
            Edwin Kirimi Kinuthia
          </a>
        </p>
      </div>
    </footer>
  );
}

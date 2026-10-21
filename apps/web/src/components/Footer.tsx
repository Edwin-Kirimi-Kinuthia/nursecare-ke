"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WHATSAPP_URL, WHATSAPP_DISPLAY } from "@carebora/shared";
import { SITE_FACTS } from "@/lib/site-facts";
import { Phone, Mail, MapPin, Facebook, Instagram, Ambulance, MessageSquare, MessageCircle } from "lucide-react";
import {
  AMBULANCE_PHONE, AMBULANCE_PHONE_DISPLAY,
  SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_ALT, SUPPORT_PHONE_ALT_DISPLAY,
  SUPPORT_EMAIL, ADMIN_EMAIL,
} from "@/lib/contact";

export default function Footer() {
  const pathname = usePathname();
  // Hide on the full-screen video consultation page.
  if (pathname?.startsWith("/consultations/")) return null;

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
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
          {/* The non-profit this belongs to, linked from every page of the site. */}
          {SITE_FACTS.parentOrgName && SITE_FACTS.parentOrgUrl && (
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Connected to{" "}
              <a href={SITE_FACTS.parentOrgUrl} className="font-semibold text-teal-700 hover:underline">
                {SITE_FACTS.parentOrgName}, our non-profit
              </a>.
            </p>
          )}
          {/* Each platform keeps its own brand colour so it's recognisable at a glance. */}
          <div className="mt-4 flex gap-2">
            <a href="https://www.facebook.com/share/1GneyXiB15/" target="_blank" rel="noreferrer" aria-label="Facebook"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] text-white shadow-sm transition hover:brightness-110">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://www.instagram.com/carebora_ke/" target="_blank" rel="noreferrer" aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-sm transition hover:brightness-110">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Care */}
        <nav aria-label="Care services" className="space-y-2 text-sm">
          <div className="font-semibold text-slate-700">Care</div>
          <Link href="/providers" className="block text-slate-500 hover:text-teal-700">Find a doctor</Link>
          <Link href="/online-doctor-kenya" className="block text-slate-500 hover:text-teal-700">See a doctor online</Link>
          <Link href="/sick-off-sheet-online-kenya" className="block text-slate-500 hover:text-teal-700">Sick-off sheet online</Link>
          <Link href="/home-visits-nairobi" className="block text-slate-500 hover:text-teal-700">Home visits</Link>
          <Link href="/ambulance-nairobi" className="block text-slate-500 hover:text-teal-700">Ambulance line</Link>
          <Link href="/pharmacy" className="block text-slate-500 hover:text-teal-700">Pharmacy</Link>
        </nav>

        {/* Company — the trust pages, linked from every page */}
        <nav aria-label="About Care Bora" className="space-y-2 text-sm">
          <div className="font-semibold text-slate-700">Care Bora</div>
          <Link href="/about" className="block text-slate-500 hover:text-teal-700">About us</Link>
          <Link href="/how-we-verify-providers" className="block text-slate-500 hover:text-teal-700">How we verify providers</Link>
          <Link href="/providers/apply" className="block text-slate-500 hover:text-teal-700">Join as a provider</Link>
          <Link href="/privacy" className="block text-slate-500 hover:text-teal-700">Privacy policy</Link>
          <Link href="/photo-credits" className="block text-slate-500 hover:text-teal-700">Photo credits</Link>
          <Link href="/delete-account" className="block text-slate-500 hover:text-teal-700">Delete your account</Link>
          <a href="/api/v1/docs" className="block text-slate-500 hover:text-teal-700">API docs</a>
        </nav>

        {/* Contact */}
        <div className="space-y-3 text-sm">
          <div className="font-semibold text-slate-700">Contact</div>
          {/* Ambulance dispatch first and visually distinct — an emergency caller
              should never have to pick it out of a list of enquiry numbers. */}
          <a
            href={`tel:${AMBULANCE_PHONE}`}
            className="flex items-center gap-2 rounded-lg bg-rose-50 px-2.5 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <Ambulance className="h-4 w-4 shrink-0" />
            <span>
              Ambulance {AMBULANCE_PHONE_DISPLAY}
              <span className="block text-[11px] font-normal text-rose-500">24/7 dispatch</span>
            </span>
          </a>
          <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Phone className="h-4 w-4 shrink-0" /> {SUPPORT_PHONE_DISPLAY}
          </a>
          <a href={`tel:${SUPPORT_PHONE_ALT}`} className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Phone className="h-4 w-4 shrink-0" /> {SUPPORT_PHONE_ALT_DISPLAY}
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Mail className="h-4 w-4 shrink-0" /> {SUPPORT_EMAIL}
          </a>
          <a href={`mailto:${ADMIN_EMAIL}`} className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <Mail className="h-4 w-4 shrink-0" /> {ADMIN_EMAIL}
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-500 hover:text-teal-700">
            <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp {WHATSAPP_DISPLAY}
          </a>
          <Link href="/contact" className="flex items-center gap-2 font-medium text-teal-700 hover:underline">
            <MessageSquare className="h-4 w-4 shrink-0" /> Message us / request a document
          </Link>
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

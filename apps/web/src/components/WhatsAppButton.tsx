"use client";

import { usePathname } from "next/navigation";
import { WHATSAPP_URL } from "@carebora/shared";

/**
 * Floating "chat on WhatsApp" button, on every public page. Hidden during a
 * video consultation, where it would sit on top of the call controls, and in the
 * admin and vendor dashboards, where it would cover table actions.
 *
 * Sits above the bottom edge by the device's safe-area inset so it clears the
 * home indicator on a phone.
 */
export default function WhatsAppButton() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/consultations/") || pathname.startsWith("/admin") || pathname.startsWith("/vendor")) return null;

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Care Bora on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 ring-4 ring-white/70 transition hover:scale-105 hover:bg-[#1EBE5A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] sm:right-6"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor" aria-hidden="true">
        <path d="M16.003 3C8.83 3 3 8.83 3 16c0 2.3.6 4.54 1.74 6.52L3 29l6.64-1.7A12.95 12.95 0 0 0 16 29c7.17 0 13-5.83 13-13S23.17 3 16.003 3Zm0 23.7c-2.03 0-4.02-.55-5.76-1.58l-.41-.25-3.94 1.01 1.05-3.84-.27-.43A10.7 10.7 0 0 1 5.3 16c0-5.9 4.8-10.7 10.7-10.7S26.7 10.1 26.7 16s-4.8 10.7-10.7 10.7Zm5.87-8c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.71.16-.21.32-.82 1.05-1 1.26-.19.21-.37.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.6-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.68s1.15 3.1 1.31 3.32c.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.82.68.77.24 1.46.21 2.01.13.61-.09 1.9-.78 2.16-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}

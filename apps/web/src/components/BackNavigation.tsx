"use client";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
export default function BackNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/" || pathname.startsWith("/consultations/")) return null;
  return <div className="mx-auto hidden max-w-6xl px-4 pt-4 md:block"><button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-50"><ArrowLeft size={16} />Back</button></div>;
}

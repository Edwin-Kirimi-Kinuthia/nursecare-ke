import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/structured-data";

/**
 * Question-and-answer list, rendered with native <details> so it works with no
 * JavaScript: the answers are in the HTML a search engine reads, and still open
 * and close for a visitor. The FAQPage markup is generated from the same array
 * the page passes in here, so what's marked up is exactly what's visible.
 */
export default function FaqList({ faqs, className = "" }: { faqs: Faq[]; className?: string }) {
  return (
    <div className={`divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      {faqs.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-5 pb-5 leading-relaxed text-slate-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

const TONE_TEXT: Record<string, string> = {
  teal: "text-teal-600",
  rose: "text-rose-600",
  violet: "text-violet-600",
  amber: "text-amber-600",
};

/**
 * The heading block every page opens with.
 *
 * Shared because it had drifted into four different treatments across ten
 * pages — three heading sizes, two weights, tracking on some and not others,
 * an icon inside the <h1> on half of them — which made the site read as though
 * each page had been built by someone else. One component means one type
 * scale, one responsive step, and a supporting line on every page rather than
 * on most.
 *
 * The section label moves out of the <h1> and becomes the eyebrow, so the
 * heading itself is just the page name and the icon has a consistent home.
 */
export default function PageHeader({
  eyebrow, Icon, title, lede, action, tone = "teal", className = "",
}: {
  eyebrow?: string;
  Icon?: LucideIcon;
  title: string;
  lede?: string;
  /** Right-aligned control — a primary action or a filter toggle. */
  action?: React.ReactNode;
  tone?: "teal" | "rose" | "violet" | "amber";
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className={`flex items-center gap-2 text-sm font-medium ${TONE_TEXT[tone]}`}>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {eyebrow}
          </p>
        )}
        <h1 className="page-title mt-4 text-slate-900">
          {title}
        </h1>
        {lede && <p className="mt-4 max-w-2xl leading-relaxed text-slate-600 sm:text-lg">{lede}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

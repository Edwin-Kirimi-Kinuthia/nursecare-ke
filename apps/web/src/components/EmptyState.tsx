import type { LucideIcon } from "lucide-react";

/**
 * The "nothing here yet" panel.
 *
 * Shared because the pages had drifted apart: two corner radii, two border
 * greys, two icon treatments and three body-text colours between them, and on
 * the provider list it was a bare line of grey text with no panel at all. An
 * empty list is a common first impression — it's what a new client sees on
 * every page before they've done anything — so it's worth being consistent.
 */
const TONE: Record<string, string> = {
  teal: "bg-teal-50 text-teal-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
};

export default function EmptyState({
  Icon, title, hint, action, tone = "teal", className = "",
}: {
  Icon: LucideIcon;
  title: string;
  hint?: string;
  /** A way out — usually the action that would fill this list. */
  action?: React.ReactNode;
  tone?: "teal" | "rose" | "violet";
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center ${className}`}>
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${TONE[tone]}`}>
        <Icon className="h-7 w-7" />
      </div>
      <p className="mt-4 font-semibold text-slate-700">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

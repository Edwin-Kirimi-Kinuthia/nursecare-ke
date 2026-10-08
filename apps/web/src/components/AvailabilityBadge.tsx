/**
 * A provider's live status, as clients see it.
 *
 * Available: bookings are confirmed instantly. Busy: they can still be booked,
 * but the provider confirms each one first. The wording says what that means
 * for the person about to book, because "Busy" on its own reads as "don't
 * bother" when the truth is "you can still book, with one extra step".
 */
export default function AvailabilityBadge({
  available, size = "sm", className = "",
}: {
  available: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const text = size === "md" ? "text-sm" : "text-xs";
  return available ? (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-emerald-700 ${text} ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Available
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-amber-700 ${text} ${className}`}>
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      Busy
      <span className="font-normal text-slate-400">· confirms bookings</span>
    </span>
  );
}

/**
 * "KES 1,500", the way the website writes it. Intl's own currency style prints
 * the local symbol ("Ksh"), which would make the app and the site disagree about
 * the same price. A missing fee shows an em dash, not "KES 0", which reads as free.
 */
export const kes = (amount: number | null | undefined) =>
  amount == null ? "—" : `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

const TZ = "Africa/Nairobi";

export const dayTime = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { timeZone: TZ, weekday: "long", day: "numeric", month: "short" });

export const timeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-KE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days} d ago` : dayTime(iso);
}

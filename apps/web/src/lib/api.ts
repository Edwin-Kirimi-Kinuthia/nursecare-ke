import { createClient } from "@carebora/api-client";

/**
 * Browser-side CareBora API client. Same-origin, so a relative baseUrl works and
 * the httpOnly auth cookies (cb_access) are sent automatically with every request
 * — no token juggling needed on the client.
 */
export const api = createClient({
  baseUrl: "/api/v1",
  // The login cookie lasts 15 minutes. While someone is using the site, quietly swap it
  // for a fresh one (the refresh cookie rides along) instead of dropping them to the login page.
  onUnauthorized: async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      return res.ok;
    } catch {
      return false;
    }
  },
});

/** Format an integer KES amount as "KES 1,500". */
export function kes(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `KES ${amount.toLocaleString("en-KE")}`;
}

/** Human-friendly date/time for a slot or appointment. */
export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

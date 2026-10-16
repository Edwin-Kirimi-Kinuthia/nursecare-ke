/**
 * Provider calendars are defined in Kenyan wall-clock time ("8am to 6pm"), so
 * the dates they are built from have to be Kenyan dates too.
 *
 * This used to take midnight and the weekday in UTC. The server runs in UTC, so
 * a rule starting at minute 480 (08:00) produced 08:00 UTC, which is 11:00 in
 * Nairobi: every doctor's day started three hours late and ended at 21:00. East
 * Africa Time is a fixed UTC+3 with no daylight saving, so a constant offset is
 * exact, not an approximation.
 */
export const NAIROBI_OFFSET_MS = 3 * 3_600_000;

/** The instant at which the Nairobi calendar day containing `d` began. */
export function startOfDay(d: Date): Date {
  const nairobi = new Date(d.getTime() + NAIROBI_OFFSET_MS);
  return new Date(Date.UTC(nairobi.getUTCFullYear(), nairobi.getUTCMonth(), nairobi.getUTCDate()) - NAIROBI_OFFSET_MS);
}

/** Day of the week in Nairobi: 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(d: Date): number {
  return new Date(d.getTime() + NAIROBI_OFFSET_MS).getUTCDay();
}

/** Return a new Date with N days added (exact: Nairobi has no daylight saving). */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/**
 * Rebuild every provider's open calendar from their weekly rules.
 *
 * One-off repair for the time-zone bug (slots were generated in UTC, so a rule
 * for 08:00 produced 11:00 Nairobi time), and safe to run again at any time.
 *
 * Only slots that are in the future AND not booked are removed. A booked slot
 * is never touched, even if its time is wrong, because someone is relying on it
 * — those are listed at the end so a person can deal with them.
 *
 *   npm run calendars:rebuild --workspace @carebora/web
 */
import { db } from "@carebora/db";
import { availabilityService } from "@carebora/core";

async function main() {
  const providers = await db.availability.findMany({ distinct: ["providerId"], select: { providerId: true } });
  let removed = 0;
  for (const { providerId } of providers) {
    const r = await db.slot.deleteMany({
      where: { providerId, isBooked: false, startsAt: { gt: new Date() }, availabilityId: { not: null } },
    });
    removed += r.count;
    const out = await availabilityService.ensureSchedule(providerId);
    console.log(`${providerId}: removed ${r.count}, ${out.eligible ? `now ${out.slotsOpen} open` : "not eligible (needs verification and a fee)"}`);
  }
  const wrong = await db.$queryRaw<{ id: string; at: string }[]>`
    SELECT s.id, to_char(s.starts_at AT TIME ZONE 'Africa/Nairobi','YYYY-MM-DD HH24:MI') AS at
    FROM slots s
    WHERE s.is_booked AND s.starts_at > now()
      AND (EXTRACT(HOUR FROM s.starts_at AT TIME ZONE 'Africa/Nairobi') < 8 OR EXTRACT(HOUR FROM s.starts_at AT TIME ZONE 'Africa/Nairobi') >= 18)`;
  console.log(`\nRemoved ${removed} unbooked slots across ${providers.length} provider(s).`);
  console.log(wrong.length ? `BOOKED slots outside 08:00-18:00 (left alone, check them): ${wrong.map((w) => w.at).join(", ")}` : "No booked slots fall outside 08:00-18:00.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());

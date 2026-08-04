/**
 * Removes test/E2E pollution from a database, restoring a clean demo state.
 * Scoped strictly to accounts whose email ends in @carebora.test (used by the
 * E2E suite and manual probes) — it never touches real demo or seeded data.
 * For each affected provider, ratings are recomputed from the remaining real
 * (visible) reviews so aggregates stay consistent.
 *
 * Run: DATABASE_URL=<url> tsx src/cleanup-test-data.ts
 */
import "dotenv/config";
import { db } from "./index";

async function main() {
  console.log("🧹  Cleaning test/E2E data…");

  const testUsers = await db.user.findMany({
    where: { email: { endsWith: "@carebora.test" } },
    select: { id: true },
  });
  const testIds = testUsers.map((u) => u.id);
  console.log(`   found ${testIds.length} test users`);

  if (!testIds.length) {
    console.log("✅  Nothing to clean.\n");
    return;
  }

  const appts = await db.appointment.findMany({
    where: { patientId: { in: testIds } },
    select: { id: true, slotId: true, providerId: true },
  });
  const apptIds = appts.map((a) => a.id);
  const slotIds = appts.map((a) => a.slotId);
  const affectedProviders = [...new Set(appts.map((a) => a.providerId))];

  if (apptIds.length) {
    // Reviews + dependents reference appointments — clear them first.
    await db.review.deleteMany({ where: { appointmentId: { in: apptIds } } });
    await db.payment.deleteMany({ where: { subjectType: "appointment", subjectId: { in: apptIds } } });
    const cons = await db.consultation.findMany({ where: { appointmentId: { in: apptIds } }, select: { id: true } });
    const consIds = cons.map((c) => c.id);
    if (consIds.length) {
      await db.message.deleteMany({ where: { consultationId: { in: consIds } } });
      await db.prescription.deleteMany({ where: { consultationId: { in: consIds } } });
      await db.consultation.deleteMany({ where: { id: { in: consIds } } });
    }
    const delAppts = await db.appointment.deleteMany({ where: { id: { in: apptIds } } });
    console.log(`   deleted ${delAppts.count} test appointments`);

    // Free the future demo slots those appointments had booked.
    await db.slot.updateMany({ where: { id: { in: slotIds }, startsAt: { gt: new Date() } }, data: { isBooked: false } });
  }

  // Home visits + orders by test users.
  const testVisits = await db.homeVisit.findMany({ where: { patientId: { in: testIds } }, select: { id: true } });
  const visitIds = testVisits.map((v) => v.id);
  if (visitIds.length) {
    await db.payment.deleteMany({ where: { subjectType: "home_visit", subjectId: { in: visitIds } } });
    await db.homeVisit.deleteMany({ where: { id: { in: visitIds } } });
  }
  const testOrders = await db.order.findMany({ where: { patientId: { in: testIds } }, select: { id: true } });
  const orderIds = testOrders.map((o) => o.id);
  if (orderIds.length) {
    await db.payment.deleteMany({ where: { subjectType: "order", subjectId: { in: orderIds } } });
    // VendorOrder and OrderItem cascade-delete with their parent Order.
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  await db.session.deleteMany({ where: { userId: { in: testIds } } });
  await db.credentials.deleteMany({ where: { userId: { in: testIds } } });
  await db.patientProfile.deleteMany({ where: { userId: { in: testIds } } });
  const delUsers = await db.user.deleteMany({ where: { id: { in: testIds } } });
  console.log(`   deleted ${delUsers.count} test users`);

  // Recompute affected providers' ratings from remaining real reviews.
  for (const providerId of affectedProviders) {
    const s = await db.review.aggregate({
      where: { providerId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await db.providerProfile.update({
      where: { userId: providerId },
      data: { ratingAvg: Math.round((s._avg.rating ?? 0) * 10) / 10, ratingCount: s._count.rating },
    });
  }
  console.log(`   recomputed ${affectedProviders.length} provider ratings`);

  console.log("✅  Cleanup complete.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());

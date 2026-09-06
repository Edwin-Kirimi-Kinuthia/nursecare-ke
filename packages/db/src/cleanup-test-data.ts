/**
 * Removes test/E2E pollution from a database, restoring a clean demo state.
 * Scoped strictly to accounts whose email ends in @carebora.test and the
 * organizations the E2E suite creates (named "E2E …") — it never touches real
 * demo or seeded data. For each affected provider, ratings are recomputed from
 * the remaining real (visible) reviews so aggregates stay consistent.
 *
 * Deletion order matters: several rows reference users and organizations
 * *without* ON DELETE CASCADE (payments, lab orders, ambulance requests, vendor
 * orders), so those have to go first or the final delete fails on a foreign key.
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

  // The E2E suite also onboards throwaway vendor businesses. Left behind they
  // show up in the admin queue and, worse, as the "nearest vendor" on the
  // public storefront.
  const testOrgs = await db.organization.findMany({
    where: { name: { startsWith: "E2E " } },
    select: { id: true },
  });
  const testOrgIds = testOrgs.map((o) => o.id);

  // Drugs are a shared catalogue, not owned by any org, so the ones invented by
  // E2E vendors outlive them — invisible on the storefront once their listings
  // cascade away, but still cluttering the admin catalogue. Counted here (and
  // deleted at the end) so a database whose test *users* are already gone still
  // gets its leftover drugs cleared rather than exiting early.
  const orphanDrugs = await db.drug.count({
    where: { name: { startsWith: "E2E " }, listings: { none: {} } },
  });

  console.log(
    `   found ${testIds.length} test users, ${testOrgIds.length} test organizations, ${orphanDrugs} orphaned drugs`,
  );

  if (!testIds.length && !testOrgIds.length && !orphanDrugs) {
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

  // Lab orders and ambulance requests (v2). Items, results and status events all
  // cascade from their parent, but the parents themselves restrict deletion of
  // both the patient and the organization, so they must go explicitly.
  const delLabOrders = await db.labOrder.deleteMany({
    where: { OR: [{ patientId: { in: testIds } }, { orderedById: { in: testIds } }, { orgId: { in: testOrgIds } }] },
  });
  const delAmbulance = await db.ambulanceRequest.deleteMany({
    where: { OR: [{ patientId: { in: testIds } }, { requestedById: { in: testIds } }] },
  });
  if (delLabOrders.count || delAmbulance.count) {
    console.log(`   deleted ${delLabOrders.count} lab orders, ${delAmbulance.count} ambulance requests`);
  }

  // A test user may have uploaded documents or read someone's record; neither
  // link cascades from the *actor* side.
  await db.medicalDocument.deleteMany({ where: { uploadedById: { in: testIds } } });
  await db.recordAccessLog.deleteMany({ where: { actorId: { in: testIds } } });

  // Finally every remaining payment involving a test user, whatever its subject
  // — ledger entries cascade from the payment.
  const delPayments = await db.payment.deleteMany({
    where: { OR: [{ patientId: { in: testIds } }, { providerId: { in: testIds } }] },
  });
  if (delPayments.count) console.log(`   deleted ${delPayments.count} test payments`);

  // Test organizations: vendor orders restrict the delete, everything else
  // (listings, branches, members, ambulances, lab tests) cascades.
  if (testOrgIds.length) {
    await db.vendorOrder.deleteMany({ where: { orgId: { in: testOrgIds } } });
    const delOrgs = await db.organization.deleteMany({ where: { id: { in: testOrgIds } } });
    console.log(`   deleted ${delOrgs.count} test organizations`);
  }

  // Only ever removes E2E-named drugs that no listing references.
  const delDrugs = await db.drug.deleteMany({
    where: { name: { startsWith: "E2E " }, listings: { none: {} } },
  });
  if (delDrugs.count) console.log(`   deleted ${delDrugs.count} orphaned test drugs`);

  await db.session.deleteMany({ where: { userId: { in: testIds } } });
  await db.credentials.deleteMany({ where: { userId: { in: testIds } } });
  await db.patientProfile.deleteMany({ where: { userId: { in: testIds } } });
  await db.providerProfile.deleteMany({ where: { userId: { in: testIds } } });
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

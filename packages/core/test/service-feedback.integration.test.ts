import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { orderService } from "../src/pharmacy/order.service";
import { storefrontService } from "../src/pharmacy/storefront.service";
import { serviceReviewService } from "../src/reviews/service-review.service";
import { reviewService } from "../src/reviews/review.service";
import { providerService } from "../src/booking/provider.service";

test("verified service feedback, fulfilment, provider ranking and medicine discovery", async t => {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL!).hostname), "Disposable local database required");
  const tag = randomUUID();
  const patient = await db.user.create({ data: { fullName: "Feedback Patient", email: `${tag}@carebora.test`, role: "patient" } });
  const other = await db.user.create({ data: { fullName: "Another Patient", email: `other-${tag}@carebora.test`, role: "patient" } });
  const org = await db.organization.create({ data: { name: "Feedback Pharmacy", slug: tag, type: "pharmacy", status: "approved", branches: { create: { name: "Main", county: "Nairobi", town: "Nairobi", latitude: -1.2864, longitude: 36.8172 } } } });
  const makeOrder = async (status: "paid" | "pending") => {
    const order = await db.order.create({ data: { patientId: patient.id, totalKes: 200, phoneNumber: "0712345678", deliveryAddress: "Test street, Nairobi" } });
    return db.vendorOrder.create({ data: { orgId: org.id, orderId: order.id, subtotalKes: 200, status } });
  };
  const paid = await makeOrder("paid"), pending = await makeOrder("pending");

  await t.test("unpaid and other pharmacies' orders cannot be marked delivered or request reviews", async () => {
    await assert.rejects(() => orderService.patchVendorOrder(org.id, pending.id, { status: "delivered" }), /Cannot move/);
    await assert.rejects(() => orderService.requestReview(org.id, paid.id), /delivered/);
    await assert.rejects(() => orderService.patchVendorOrder(randomUUID(), paid.id, { status: "delivered" }), /not found/i);
  });
  await t.test("one-step delivery preserves an honest timeline and requests a review once", async () => {
    const delivered = await orderService.patchVendorOrder(org.id, paid.id, { status: "delivered" });
    assert.equal(delivered.status, "delivered"); assert.ok(delivered.deliveredAt);
    assert.equal(delivered.dispatchedAt, null);
    assert.equal(delivered.statusHistory.length, 1);
    await orderService.patchVendorOrder(org.id, paid.id, { status: "delivered" });
    await orderService.requestReview(org.id, paid.id);
    assert.equal(await db.notification.count({ where: { userId: patient.id, type: "service_review_requested" } }), 1);
  });
  await t.test("only the buyer reviews a delivered vendor order, once", async () => {
    await assert.rejects(() => serviceReviewService.create(other.id, { serviceType: "vendor_order", subjectId: paid.id, rating: 5 }), /own services/);
    await assert.rejects(() => serviceReviewService.create(patient.id, { serviceType: "vendor_order", subjectId: pending.id, rating: 5 }), /completed/);
    const input = { serviceType: "vendor_order" as const, subjectId: paid.id, rating: 5, comment: "Helpful pharmacy" };
    const review = await serviceReviewService.create(patient.id, input);
    await assert.rejects(() => serviceReviewService.create(patient.id, input), /already reviewed/);
    const pharmacy = await serviceReviewService.listOrganization(org.id);
    assert.equal(pharmacy.ratingAvg, 5); assert.equal(pharmacy.ratingCount, 1);
    assert.equal("patientId" in pharmacy.reviews[0]!, false);
    await reviewService.moderate(review.id, { isVisible: false });
    assert.equal((await serviceReviewService.listOrganization(org.id)).ratingCount, 0);
    await reviewService.moderate(review.id, { isVisible: true });
  });

  const providers = [];
  for (let i = 0; i < 3; i++) {
    const user = await db.user.create({ data: { fullName: `Feedback clinician ${i}`, email: `provider${i}-${tag}@carebora.test`, role: "doctor", providerProfile: { create: { verificationStatus: "verified", specialty: tag } } } });
    providers.push(user);
  }
  const visit = (providerId: string, status: "completed" | "pending" = "completed") => db.homeVisit.create({ data: { patientId: patient.id, providerId, status, specialty: "doctor", description: "Test visit", address: "Test address", county: "Nairobi" } });
  await t.test("home visit reviews appear on profiles; rank stars then all completed care before pagination", async () => {
    for (let i=0; i<3; i++) {
      const v = await visit(providers[i]!.id);
      await serviceReviewService.create(patient.id, { serviceType: "home_visit", subjectId: v.id, rating: i===2 ? 4 : 5 });
    }
    await visit(providers[1]!.id); await visit(providers[1]!.id);
    const slot = await db.slot.create({ data: { providerId: providers[0]!.id, appointmentType: "teleconsult", startsAt: new Date(), endsAt: new Date(Date.now()+1800000) } });
    const appointment = await db.appointment.create({ data: { patientId: patient.id, providerId: providers[0]!.id, slotId: slot.id, appointmentType: "teleconsult", status: "completed", feeKes: 100 } });
    await reviewService.create(patient.id, appointment.id, { rating: 5 });
    const list = await providerService.list({ limit: 50, offset: 0, specialty: tag });
    assert.deepEqual(list.providers.slice(0,3).map(p => p.userId), [providers[1]!.id, providers[0]!.id, providers[2]!.id]);
    assert.equal((await providerService.list({ limit: 1, offset: 1, specialty: tag })).providers[0]!.userId, providers[0]!.id);
    const profile = await providerService.getById(providers[0]!.id);
    assert.equal(profile.completedConsultations, 1); assert.equal(profile.completedHomeVisits, 1); assert.equal(profile.completedServices, 2); assert.equal(profile.ratingCount, 2);
    assert.equal((await reviewService.listByProvider(providers[0]!.id, { limit: 20, offset: 0 })).total, 2);
    const pendingVisit = await visit(providers[0]!.id,"pending");
    await assert.rejects(() => serviceReviewService.create(patient.id, { serviceType:"home_visit", subjectId:pendingVisit.id,rating:5 }), /completed/);
  });
  await t.test("completed labs and ambulance services can be reviewed", async () => {
    const lab = await db.organization.create({ data: { name:"Test Lab",slug:`lab-${tag}`,type:"lab",status:"approved" } });
    const order = await db.labOrder.create({ data: { patientId:patient.id,orderedById:patient.id,orgId:lab.id,status:"resulted",totalKes:100 } });
    assert.equal((await serviceReviewService.create(patient.id,{serviceType:"lab_order",subjectId:order.id,rating:4})).orgId,lab.id);
    const ambulanceOrg = await db.organization.create({ data: {name:"Test Ambulance",slug:`ambulance-${tag}`,type:"ambulance",status:"approved"} });
    const request = await db.ambulanceRequest.create({ data: {patientId:patient.id,requestedById:patient.id,orgId:ambulanceOrg.id,status:"completed",pickupAddress:"Test street",pickupCounty:"Nairobi",pickupLatitude:-1.28,pickupLongitude:36.81,patientCondition:"Test",contactPhone:"0712345678"} });
    await serviceReviewService.create(patient.id,{serviceType:"ambulance",subjectId:request.id,rating:5});
    assert.equal((await serviceReviewService.listOrganization(ambulanceOrg.id)).ratingCount,1);
  });
  await t.test("price order is applied before pagination and Rx/OTC and county filters work", async () => {
    for (const [price,rx] of [[500,true],[100,false],[300,true]] as const) {
      const drug = await db.drug.create({data:{name:`Feedback medicine ${price} ${tag}`,category:"Test",requiresPrescription:rx}});
      await db.listing.create({data:{orgId:org.id,priceKes:price,stockQty:20,drugId:drug.id}});
    }
    const query={search:tag,limit:1,offset:0,sort:"price_desc" as const};
    assert.equal((await storefrontService.searchDrugs(query)).drugs[0]!.unitPriceKes,500);
    assert.equal((await storefrontService.searchDrugs({...query,offset:1})).drugs[0]!.unitPriceKes,300);
    assert.equal((await storefrontService.searchDrugs({...query,sort:"price_asc"})).drugs[0]!.unitPriceKes,100);
    assert.equal((await storefrontService.searchDrugs({...query,requiresPrescription:false})).total,1);
    assert.equal((await storefrontService.searchDrugs({...query,requiresPrescription:true})).total,2);
    assert.equal((await storefrontService.searchDrugs({...query,county:"Mombasa"})).total,0);
  });
  await db.$disconnect();
});

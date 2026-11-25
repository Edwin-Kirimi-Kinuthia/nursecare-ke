import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { notificationService } from "../src/notifications/notification.service";
import { reviewInvitationService } from "../src/reviews/review-invitation.service";
import { orderService } from "../src/pharmacy/order.service";
import { serviceReviewService } from "../src/reviews/service-review.service";
import { storefrontService } from "../src/pharmacy/storefront.service";

test("completed service review emails are scoped, retryable and deduplicated; real reviews rank sellers", async t => {
  assert.ok(["localhost","127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname));
  const tag = randomUUID();
  const patient = await db.user.create({ data: { fullName: "Review client", email: `${tag}@carebora.test`, role: "patient" } });
  const provider = await db.user.create({ data: { fullName: "Review clinician", email: `clinician-${tag}@carebora.test`, role: "doctor", providerProfile: {create:{verificationStatus:"verified"}} } });
  const org = await db.organization.create({data:{name:"Rated pharmacy",slug:tag,type:"pharmacy",status:"approved",branches:{create:{name:"Main",county:"Nairobi",latitude:-1.28,longitude:36.8}}}});
  const order = await db.order.create({data:{patientId:patient.id,totalKes:100,phoneNumber:"0712345678",deliveryAddress:"Test address"}});
  const vo = await db.vendorOrder.create({data:{orgId:org.id,orderId:order.id,status:"delivered",subtotalKes:100}});
  const calls: Parameters<typeof notificationService.reviewInvitation>[0][] = [];
  let fail = false;
  t.mock.method(notificationService,"reviewInvitation",async (input: Parameters<typeof notificationService.reviewInvitation>[0]) => { calls.push(input); if(fail) throw new Error("Mock email failure"); });
  await t.test("only the right vendor can request, and repeated clicks send one email to the purchaser",async()=>{
    await assert.rejects(()=>orderService.requestReview(randomUUID(),vo.id),/not found/i);
    await orderService.requestReview(org.id,vo.id);
    await orderService.requestReview(org.id,vo.id);
    assert.equal(calls.length,1);assert.equal(calls[0]!.email,patient.email);assert.equal(calls[0]!.path,`/orders/${order.id}#review-${vo.id}`);
  });
  const slot = await db.slot.create({data:{providerId:provider.id,appointmentType:"teleconsult",startsAt:new Date(),endsAt:new Date(Date.now()+1800000)}});
  const appointment = await db.appointment.create({data:{patientId:patient.id,providerId:provider.id,slotId:slot.id,appointmentType:"teleconsult",status:"completed",feeKes:0}});
  await t.test("provider invitations enforce assigned clinician, completion and retry failed transport",async()=>{
    await assert.rejects(()=>reviewInvitationService.forProvider(patient.id,{serviceType:"appointment",subjectId:appointment.id}),/not found/i);
    fail=true;
    await assert.rejects(()=>reviewInvitationService.forProvider(provider.id,{serviceType:"appointment",subjectId:appointment.id}),/Mock email failure/);
    const retry = await db.reviewInvitation.findUniqueOrThrow({where:{subjectType_subjectId:{subjectType:"appointment",subjectId:appointment.id}}});
    assert.equal(retry.emailSentAt,null);assert.equal(retry.claimUntil,null);
    fail=false;
    await reviewInvitationService.forProvider(provider.id,{serviceType:"appointment",subjectId:appointment.id});
    await reviewInvitationService.forProvider(provider.id,{serviceType:"appointment",subjectId:appointment.id});
    assert.equal(calls.length,3);assert.equal(calls[1]!.idempotencyKey,calls[2]!.idempotencyKey);
    assert.equal(calls[2]!.email,patient.email);assert.equal(calls[2]!.path,`/appointments?review=${appointment.id}`);
    const visit=await db.homeVisit.create({data:{patientId:patient.id,providerId:provider.id,status:"pending",specialty:"doctor",description:"Test visit",address:"Test address",county:"Nairobi"}});
    await assert.rejects(()=>reviewInvitationService.forProvider(provider.id,{serviceType:"home_visit",subjectId:visit.id}),/Complete this visit/);
    await db.homeVisit.update({where:{id:visit.id},data:{status:"completed"}});
    await reviewInvitationService.forProvider(provider.id,{serviceType:"home_visit",subjectId:visit.id});
    assert.equal(calls.at(-1)!.path,`/home-visits/${visit.id}`);
  });
  await t.test("ratings then completed deliveries determine vendor order; price sort remains explicit",async()=>{
    const drug=await db.drug.create({data:{name:`Ranked drug ${tag}`,category:tag,listings:{create:{orgId:org.id,priceKes:200,stockQty:100}}}});
    const other=await db.organization.create({data:{name:"Cheaper pharmacy",slug:`other-${tag}`,type:"pharmacy",status:"approved",branches:{create:{name:"Main",county:"Nairobi",latitude:-1.28,longitude:36.8}},listings:{create:{drugId:drug.id,priceKes:100,stockQty:100}}}});
    const otherOrder=await db.vendorOrder.create({data:{orgId:other.id,orderId:order.id,status:"delivered",subtotalKes:100}});
    await serviceReviewService.create(patient.id,{serviceType:"vendor_order",subjectId:vo.id,rating:5});
    await serviceReviewService.create(patient.id,{serviceType:"vendor_order",subjectId:otherOrder.id,rating:4});
    assert.equal((await storefrontService.getOffers(drug.id,{})).offers[0]!.orgId,org.id);
    assert.equal((await storefrontService.searchDrugs({search:drug.name,sort:"rating",limit:10,offset:0})).drugs[0]!.nearestVendor.orgId,org.id);
    assert.equal((await storefrontService.searchDrugs({search:drug.name,sort:"price_asc",limit:10,offset:0})).drugs[0]!.nearestVendor.orgId,other.id);
    const third=await db.organization.create({data:{name:"Established pharmacy",slug:`third-${tag}`,type:"pharmacy",status:"approved",branches:{create:{name:"Main",county:"Nairobi",latitude:-1.28,longitude:36.8}},listings:{create:{drugId:drug.id,priceKes:300,stockQty:100}}}});
    const thirdOrder=await db.vendorOrder.create({data:{orgId:third.id,orderId:order.id,status:"delivered",subtotalKes:100}});
    await db.vendorOrder.create({data:{orgId:third.id,orderId:order.id,status:"delivered",subtotalKes:100}});
    await serviceReviewService.create(patient.id,{serviceType:"vendor_order",subjectId:thirdOrder.id,rating:5});
    assert.equal((await storefrontService.getOffers(drug.id,{})).offers[0]!.orgId,third.id);
    assert.equal((await orderService.requestReview(org.id,vo.id)).status,"already_reviewed");
  });
});

test("review email uses the specific recipient, escaped labels and an idempotency key",async t=>{
  const old=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY="re_test_fake";
  let payload: Record<string,unknown>={};let key="";
  t.mock.method(globalThis,"fetch",async (_url: unknown,init: RequestInit)=>{payload=JSON.parse(init.body as string);key=new Headers(init.headers).get("Idempotency-Key")??"";return new Response(JSON.stringify({id:"mock-email-id"}),{status:200,headers:{"Content-Type":"application/json"}});});
  try {
    await notificationService.reviewInvitation({email:"recipient@carebora.test",fullName:"Test client",serviceName:"<script>Vendor</script>",path:"/appointments?review=example",idempotencyKey:"review-test"});
    assert.deepEqual([payload.to].flat(),["recipient@carebora.test"]);assert.ok(String(payload.html).includes("&lt;script&gt;Vendor&lt;/script&gt;"));assert.ok(String(payload.html).includes("/appointments?review=example"));assert.equal(key,"review-test");
  } finally {if(old===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=old;}
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { authService, issueSession } from "../src/auth/auth.service";
import { settlementService } from "../src/payment/settlement.service";
import { orderService } from "../src/pharmacy/order.service";
import { hashPassword } from "../src/auth/password";

assert.ok(["localhost","127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname));
const hash=(value:string)=>createHash("sha256").update(value).digest("hex");
async function userFixture(run:(id:string,email:string)=>Promise<void>) {
  const user=await db.user.create({data:{email:`audit-${randomUUID()}@carebora.test`,fullName:"Audit client",role:"patient",credentials:{create:{passwordHash:hashPassword("InitialPassword123!")}}}});
  try {await run(user.id,user.email);} finally {await db.user.delete({where:{id:user.id}});}
}
function barrier() {let count=0;let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);return async()=>{if(++count===2)release();await gate;};}
async function codeRace(channel:string,action:(id:string,email:string,value:string)=>Promise<unknown>) {
  await userFixture(async(id,email)=>{
    const value=channel==="invite"?randomUUID():"123456";
    await db.verificationCode.create({data:{userId:id,channel,codeHash:hash(value),expiresAt:new Date(Date.now()+600_000)}});
    const original=db.verificationCode.findFirst.bind(db.verificationCode),meet=barrier();
    db.verificationCode.findFirst=(async(...args:Parameters<typeof db.verificationCode.findFirst>)=>{const result=await original(...args);await meet();return result;}) as typeof db.verificationCode.findFirst;
    try {
      const results=await Promise.allSettled([action(id,email,value),action(id,email,value)]);
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1,"single-use code must authorize exactly one concurrent request");
    } finally {db.verificationCode.findFirst=original;}
  });
}
for(const channel of ["login_otp","email","change_password_otp","invite"] as const) {
  test(`concurrent ${channel} verification consumes its code exactly once`,async()=>codeRace(channel,(id,email,value)=>channel==="login_otp"?authService.verifyLoginOtp(email,value):channel==="email"?authService.verifyEmail(id,value):channel==="invite"?authService.setPassword(value,"NewPassword123!"):authService.confirmChangePassword(id,value,"NewPassword123!")));
}
test("refresh token cannot create two replacement sessions concurrently",async()=>userFixture(async(id)=>{
  const session=await issueSession(id,"patient"),meet=barrier();const original=db.session.findFirst.bind(db.session);
  db.session.findFirst=(async(...args:Parameters<typeof db.session.findFirst>)=>{const result=await original(...args);await meet();return result;}) as typeof db.session.findFirst;
  try {const results=await Promise.allSettled([authService.refresh(session.refreshToken),authService.refresh(session.refreshToken)]);assert.equal(results.filter(r=>r.status==="fulfilled").length,1);} finally {db.session.findFirst=original;}
}));
test("password reset invalidates older reset links and refresh sessions",async()=>userFixture(async(id)=>{
  const session=await issueSession(id,"patient");const tokens=[randomUUID(),randomUUID()];
  for(const token of tokens)await db.verificationCode.create({data:{userId:id,channel:"invite",codeHash:hash(token),expiresAt:new Date(Date.now()+600_000)}});
  await authService.setPassword(tokens[1]!,"ChangedPassword123!");
  await assert.rejects(()=>authService.setPassword(tokens[0]!,"OldLinkPassword123!"),/invalid|expired/i);
  await assert.rejects(()=>authService.refresh(session.refreshToken),/expired|invalid/i);
}));

async function orderFixture(run:(f:{orderId:string;paymentId:string;listingId:string;vendorOrderId:string})=>Promise<void>) {
  await userFixture(async(patientId)=>{
    const tag=randomUUID();const org=await db.organization.create({data:{name:"Audit pharmacy",slug:tag,type:"pharmacy",status:"approved",commissionPercent:10}});
    const drug=await db.drug.create({data:{name:"Audit medicine",category:"Audit"}});
    const listing=await db.listing.create({data:{orgId:org.id,drugId:drug.id,stockQty:8,priceKes:50}});
    const order=await db.order.create({data:{patientId,totalKes:100,phoneNumber:"0712345678",deliveryAddress:"Test",vendorOrders:{create:{orgId:org.id,subtotalKes:100,items:{create:{listingId:listing.id,drugName:drug.name,qty:2,unitPriceKes:50}}}}},include:{vendorOrders:true}});
    const payment=await db.payment.create({data:{patientId,subjectType:"order",subjectId:order.id,gatewayRef:tag,amountKes:100,commissionPercentSnapshot:10,phoneNumber:"0712345678",status:"completed"}});
    try {await run({orderId:order.id,paymentId:payment.id,listingId:listing.id,vendorOrderId:order.vendorOrders[0]!.id});}
    finally {await db.payment.delete({where:{id:payment.id}});await db.order.delete({where:{id:order.id}});await db.listing.delete({where:{id:listing.id}});await db.drug.delete({where:{id:drug.id}});await db.organization.delete({where:{id:org.id}});}
  });
}
for(const outcome of ["paid","failed"] as const) {
 test(`concurrent pharmacy ${outcome} callbacks affect stock and ledger once`,async()=>orderFixture(async f=>{
  const original=db.vendorOrder.findMany.bind(db.vendorOrder),meet=barrier();
  db.vendorOrder.findMany=(async(...args:Parameters<typeof db.vendorOrder.findMany>)=>{const result=await original(...args);await meet();return result;}) as typeof db.vendorOrder.findMany;
  try {
    await Promise.all([1,2].map(()=>outcome==="paid"?orderService.onPaymentSettled(f.orderId,f.paymentId):orderService.onPaymentFailed(f.orderId)));
    if(outcome==="paid") {
      const ledger=await db.ledgerEntry.findMany({where:{paymentId:f.paymentId}});
      assert.equal(ledger.filter(e=>e.type==="vendor_payout").length,1);assert.equal(ledger.filter(e=>e.type==="platform_fee").length,1);
    } else assert.equal((await db.listing.findUniqueOrThrow({where:{id:f.listingId}})).stockQty,10);
    assert.equal(await db.vendorOrderStatusEvent.count({where:{vendorOrderId:f.vendorOrderId}}),1);
  } finally {db.vendorOrder.findMany=original;}
 }));
}

test("a delayed failure callback cannot cancel an already confirmed payment",async()=>orderFixture(async f=>{
  const payment=await db.payment.findUniqueOrThrow({where:{id:f.paymentId}});
  try {
    await settlementService.handleDarajaCallback({Body:{stkCallback:{CheckoutRequestID:payment.gatewayRef,MerchantRequestID:"audit-merchant",ResultCode:1032,ResultDesc:"Delayed cancellation"}}});
    assert.equal((await db.vendorOrder.findUniqueOrThrow({where:{id:f.vendorOrderId}})).status,"paid");
    assert.equal((await db.listing.findUniqueOrThrow({where:{id:f.listingId}})).stockQty,8);
  } finally {await db.paymentEvent.deleteMany({where:{dedupeKey:{startsWith:`daraja:${payment.gatewayRef}:`}}});}
}));

test("a disabled account cannot change its password through an old reset link",async()=>userFixture(async(id)=>{
  const token=randomUUID();const before=await db.credentials.findUniqueOrThrow({where:{userId:id}});
  await db.verificationCode.create({data:{userId:id,channel:"invite",codeHash:hash(token),expiresAt:new Date(Date.now()+600_000)}});
  await db.user.update({where:{id},data:{isActive:false}});
  await assert.rejects(()=>authService.setPassword(token,"DisabledPassword123!"),/disabled/i);
  assert.equal((await db.credentials.findUniqueOrThrow({where:{userId:id}})).passwordHash,before.passwordHash);
}));

test("password reset and refresh rotation cannot leave an earlier session active",async()=>userFixture(async(id)=>{
  for(let attempt=0;attempt<5;attempt++) {
    const before=await issueSession(id,"patient"),token=randomUUID();
    await db.verificationCode.create({data:{userId:id,channel:"invite",codeHash:hash(token),expiresAt:new Date(Date.now()+600_000)}});
    const [rotation,reset]=await Promise.allSettled([authService.refresh(before.refreshToken),authService.setPassword(token,"ChangedPassword123!")]);
    assert.equal(reset.status,"fulfilled");
    if(rotation.status==="fulfilled") {
      const session=await db.session.findFirstOrThrow({where:{refreshTokenHash:hash(rotation.value.refreshToken)}});
      assert.ok(session.revokedAt,"a refresh racing the password reset must not survive it");
    }
    assert.equal(await db.session.count({where:{userId:id,revokedAt:null}}),1);
  }
}));

import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import { authService } from "../src/auth/auth.service";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { notificationService } from "../src/notifications/notification.service";

test("sign-in resend and password recovery survive expired codes and failed delivery", async t => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname));
  const user = await db.user.create({data:{email:`recovery-${randomUUID()}@carebora.test`,fullName:"Recovery test",role:"patient",credentials:{create:{passwordHash:hashPassword("Test12345!")}}}});
  let fail=false, code="", token="";
  t.mock.method(notificationService,"loginOtpCode",async (input:{code:string})=>{if(fail) throw new Error("Email unavailable");code=input.code;});
  t.mock.method(notificationService,"passwordResetRequested",async (input:{token:string})=>{if(fail) throw new Error("Email unavailable");token=input.token;});
  try {
    await t.test("no sign-in challenge cannot send; a failed initial delivery leaves no dead code",async()=>{
      assert.deepEqual(await authService.resendLoginOtp(user.email),{sent:false});
      fail=true;await assert.rejects(()=>authService.login({email:user.email,password:"Test12345!"}),/Email unavailable/);
      assert.equal(await db.verificationCode.count({where:{userId:user.id}}),0);fail=false;
    });
    await t.test("an expired OTP can be replaced within the password-proven challenge window",async()=>{
      await authService.login({email:user.email,password:"Test12345!"});
      await db.verificationCode.updateMany({where:{userId:user.id},data:{createdAt:new Date(Date.now()-15*60_000),expiresAt:new Date(Date.now()-5*60_000)}});
      assert.deepEqual(await authService.resendLoginOtp(user.email),{sent:true});
      const before=await db.verificationCode.count({where:{userId:user.id}});
      fail=true;await assert.rejects(()=>authService.resendLoginOtp(user.email),/Email unavailable/);fail=false;
      assert.equal(await db.verificationCode.count({where:{userId:user.id}}),before);
      assert.equal((await authService.verifyLoginOtp(user.email,code)).user.id,user.id);
      await assert.rejects(()=>authService.verifyLoginOtp(user.email,code),/Invalid or expired/);
      assert.deepEqual(await authService.resendLoginOtp(user.email),{sent:false});
      await db.verificationCode.updateMany({where:{userId:user.id},data:{createdAt:new Date(Date.now()-31*60_000)}});
      assert.deepEqual(await authService.resendLoginOtp(user.email),{sent:false});
    });
    await t.test("forgot password emails a working single-use link; failure is retryable",async()=>{
      assert.deepEqual(await authService.forgotPassword(`missing-${randomUUID()}@carebora.test`),{sent:true});
      fail=true;await assert.rejects(()=>authService.forgotPassword(user.email),/Email unavailable/);fail=false;
      assert.equal(await db.verificationCode.count({where:{userId:user.id,channel:"invite"}}),0);
      assert.deepEqual(await authService.forgotPassword(user.email),{sent:true});
      assert.equal((await authService.setPassword(token,"NewPassword123!")).user.id,user.id);
      assert.ok(verifyPassword("NewPassword123!",(await db.credentials.findUniqueOrThrow({where:{userId:user.id}})).passwordHash));
      await assert.rejects(()=>authService.setPassword(token,"AnotherPassword123!"),/invalid or has expired/);
    });
  } finally { await db.user.delete({where:{id:user.id}}); }
});

test("authentication email transport never reports a rejected or missing email as sent",async t=>{
  const previous=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY="re_fake_test";
  let status=422,html="";
  t.mock.method(globalThis,"fetch",async (_url:unknown,init:RequestInit)=>{html=JSON.parse(String(init.body)).html;return new Response(JSON.stringify(status===200?{id:"test-email"}:{name:"validation_error",message:"Mock rejection"}),{status,headers:{"Content-Type":"application/json"}});});
  const input={email:"recipient@carebora.test",fullName:"Test client",code:"123456",token:"test-reset-token"};
  try {
    for(const method of ["loginOtpCode","emailVerificationCode","changePasswordOtp","passwordResetRequested"] as const) {
      await assert.rejects(()=>notificationService[method](input),/email could not be sent/i);
      status=200;await notificationService[method](input);assert.ok(html.includes(method==="passwordResetRequested"?"/set-password?token=test-reset-token":"123456"));status=422;
    }
    delete process.env.RESEND_API_KEY;
    await assert.rejects(()=>notificationService.loginOtpCode(input),/delivery is unavailable/i);
  } finally {if(previous===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=previous;}
});

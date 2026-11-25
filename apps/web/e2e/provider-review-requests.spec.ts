import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

test("providers can invite only their completed clients, and client review links open the right form",async({page,request})=>{
  if (!["localhost","127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Disposable local database required");
  const tag=randomUUID();
  const patient=await db.user.create({data:{fullName:"Review client",email:`client-${tag}@carebora.test`,role:"patient"}});
  const provider=await db.user.create({data:{fullName:"Review doctor",email:`doctor-${tag}@carebora.test`,role:"doctor",providerProfile:{create:{verificationStatus:"verified"}}}});
  const slot=await db.slot.create({data:{providerId:provider.id,appointmentType:"teleconsult",startsAt:new Date(),endsAt:new Date(Date.now()+1800000)}});
  const appointment=await db.appointment.create({data:{patientId:patient.id,providerId:provider.id,slotId:slot.id,appointmentType:"teleconsult",status:"confirmed",feeKes:0}});
  const visit=await db.homeVisit.create({data:{patientId:patient.id,providerId:provider.id,status:"completed",specialty:"doctor",description:"Test visit",address:"Test address",county:"Nairobi"}});
  const patientToken=await signAccessToken({sub:patient.id,role:"patient"}),providerToken=await signAccessToken({sub:provider.id,role:"doctor"});
  const input={serviceType:"appointment",subjectId:appointment.id};
  const endpoint="/api/v1/providers/me/review-requests";
  try {
    expect((await request.post(endpoint,{data:input})).status()).toBe(401);
    expect((await request.post(endpoint,{headers:{Authorization:`Bearer ${patientToken}`},data:input})).status()).toBe(404);
    expect((await request.post(endpoint,{headers:{Authorization:`Bearer ${providerToken}`},data:input})).status()).toBe(400);
    await db.appointment.update({where:{id:appointment.id},data:{status:"completed"}});
    await page.context().addCookies([{name:"cb_access",value:providerToken,url:test.info().project.use.baseURL!}]);
    await page.goto("/appointments");
    await expect(page.getByRole("button",{name:"Request client review",exact:true})).toBeVisible();
    if (!process.env.RESEND_API_KEY) {
      await page.getByRole("button",{name:"Request client review",exact:true}).click();
      await expect(page.getByRole("alert").filter({hasText:"Review email is unavailable"})).toBeVisible();
      expect((await db.reviewInvitation.findUniqueOrThrow({where:{subjectType_subjectId:{subjectType:"appointment",subjectId:appointment.id}}})).emailSentAt).toBeNull();
    }
    await page.context().clearCookies();
    await page.context().addCookies([{name:"cb_access",value:patientToken,url:test.info().project.use.baseURL!}]);
    await page.goto(`/appointments?review=${appointment.id}`);
    await expect(page.getByRole("button",{name:/^5 stars/})).toBeVisible();
    await page.goto(`/home-visits/${visit.id}`);
    await expect(page.getByRole("button",{name:"5 stars",exact:true})).toBeVisible();
  } finally {
    await db.reviewInvitation.deleteMany({where:{subjectId:{in:[appointment.id,visit.id]}}});
    await db.homeVisit.delete({where:{id:visit.id}});await db.appointment.delete({where:{id:appointment.id}});await db.slot.delete({where:{id:slot.id}});
    await db.providerProfile.delete({where:{userId:provider.id}});await db.user.deleteMany({where:{id:{in:[patient.id,provider.id]}}});
  }
});

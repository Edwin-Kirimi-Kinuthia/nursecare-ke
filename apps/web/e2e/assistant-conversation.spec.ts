import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

let patientId:string, otherId:string, adminId:string, orgId:string, drugId:string, listingId:string, orderId:string, otherOrderId:string;
let token:string, adminToken:string;
const tag=randomUUID().replaceAll("-","");const name=`Assistdrug${tag}`;
test.beforeAll(async()=>{
  if(!["localhost","127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname))throw new Error("Disposable database required");
  const patient=await db.user.create({data:{email:`assistant-${tag}@carebora.test`,fullName:"Assistant client",role:"patient"}});patientId=patient.id;
  const other=await db.user.create({data:{email:`other-${tag}@carebora.test`,fullName:"Other client",role:"patient"}});otherId=other.id;
  const admin=await db.user.create({data:{email:`admin-${tag}@carebora.test`,fullName:"Assistant admin",role:"admin"}});adminId=admin.id;
  const org=await db.organization.create({data:{name:`Assistant pharmacy ${tag}`,slug:tag,type:"pharmacy",status:"approved",branches:{create:{name:"Main",county:"Nairobi",latitude:-1.28,longitude:36.8}}}});orgId=org.id;
  const drug=await db.drug.create({data:{name,category:"Assistant test",form:"tablet",requiresPrescription:true}});drugId=drug.id;
  const listing=await db.listing.create({data:{drugId,orgId,priceKes:25,stockQty:100,minOrderQty:10}});listingId=listing.id;
  async function order(id:string,date:Date){return db.order.create({data:{patientId:id,totalKes:250,phoneNumber:"0712345678",deliveryAddress:"Private address never disclosed in chat",createdAt:date,vendorOrders:{create:{orgId,status:"dispatched",subtotalKes:250,items:{create:{listingId,drugName:name,unitPriceKes:25,qty:10}}}}}});}
  orderId=(await order(patientId,new Date("2010-01-01"))).id;
  for(let i=0;i<4;i++)await order(patientId,new Date());
  otherOrderId=(await order(otherId,new Date())).id;
  token=await signAccessToken({sub:patientId,role:"patient"});adminToken=await signAccessToken({sub:adminId,role:"admin"});
});
test.afterAll(async()=>{
  if(!patientId)return;
  await db.order.deleteMany({where:{patientId:{in:[patientId,otherId]}}});await db.listing.delete({where:{id:listingId}});await db.drug.delete({where:{id:drugId}});await db.organization.delete({where:{id:orgId}});await db.user.deleteMany({where:{id:{in:[patientId,otherId,adminId]}}});
});
const auth=(value:string)=>({Authorization:`Bearer ${value}`});
test("assistant finds live medicine offers, units and minimums, and follows up on that medicine",async({request})=>{
  for(const data of [{message:`Search for ${name}`},{message:"How much?",history:[{role:"user",content:`Search for ${name}`}]}]){
    const response=await request.post("/api/v1/ai/navigate",{data});expect(response.status()).toBe(200);const r=(await response.json()).data;
    expect(r.actions.find((a:{id:string})=>a.id===`drug:${drugId}`)).toMatchObject({title:name,web:`/pharmacy/${drugId}`,mobile:`/pharmacy/${drugId}`,detail:expect.stringContaining("KES 25 per tablet · Minimum 10")});
    expect(r.actions[0].detail).toContain("Prescription required");expect(JSON.stringify(r)).not.toContain("data:image");
  }
  await db.listing.update({where:{id:listingId},data:{stockQty:9}});
  try{const res=await request.post("/api/v1/ai/navigate",{data:{message:`Search for ${name}`}});expect((await res.json()).data.actions.some((a:{id:string})=>a.id.startsWith("drug:"))).toBe(false);}
  finally{await db.listing.update({where:{id:listingId},data:{stockQty:100}});}
});
test("reference lookup finds older owned orders and never exposes another customer's order",async({request})=>{
  const reference=orderId.slice(0,8).toUpperCase();
  for(const message of [reference, `Order ${orderId}`, `# ${reference}`]) {
    const owned=await request.post("/api/v1/ai/navigate",{headers:auth(token),data:{message}});expect(owned.status()).toBe(200);const r=(await owned.json()).data;
    expect(r.actions.find((a:{id:string})=>a.id===`order:${orderId}`)).toMatchObject({title:`Order #${reference}`,detail:expect.stringContaining("Dispatched"),web:`/orders/${orderId}`});
    expect(JSON.stringify(r)).not.toContain("Private address");
  }
  const foreign=await request.post("/api/v1/ai/navigate",{headers:auth(token),data:{message:`Track order #${otherOrderId.slice(0,8)}`,userId:otherId,role:"admin"}});
  expect((await foreign.json()).data.actions.some((a:{id:string})=>a.id.startsWith("order:")||a.id==="admin-orders")).toBe(false);
  const guest=await request.post("/api/v1/ai/navigate",{data:{message:`Track order #${reference}`,userId:patientId,role:"admin"}});expect((await guest.json()).data.message).toContain("Sign in");
  const admin=await request.post("/api/v1/ai/navigate",{headers:auth(adminToken),data:{message:"Track my latest pharmacy orders"}});const a=(await admin.json()).data;
  expect(a.actions.some((x:{id:string})=>x.id.startsWith("order:"))).toBe(false);expect(a.actions.find((x:{id:string})=>x.id==="admin-orders").web).toBe("/admin?tab=orders");
});
test("conversation remembers follow-ups across navigation, stays compact, and can be cleared",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto("/");await page.getByRole("button",{name:"Open navigation assistant",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Care Bora navigation assistant"});
  await dialog.getByRole("button",{name:"How do I book a doctor?",exact:true}).click();await expect(dialog.getByRole("log")).toContainText("available appointment");
  const request=page.waitForRequest(r=>r.url().endsWith("/ai/navigate")&&r.method()==="POST");
  await dialog.getByRole("textbox",{name:"Ask for help navigating"}).fill("How much?");await dialog.getByRole("button",{name:"Send question",exact:true}).click();
  expect((await request).postDataJSON().history.some((t:{content:string})=>t.content==="How do I book a doctor?")).toBe(true);
  await expect(dialog.getByRole("log")).toContainText("For a consultation");
  const bounds=await dialog.boundingBox();expect(bounds!.width).toBeLessThanOrEqual(390);expect(bounds!.y).toBeGreaterThanOrEqual(0);
  await dialog.getByRole("link",{name:"Consultations",exact:false}).click();await expect(page).toHaveURL(/\/providers$/);
  await page.getByRole("button",{name:"Open navigation assistant",exact:true}).click();await expect(dialog.getByRole("log")).toContainText("For a consultation");
  await dialog.getByRole("button",{name:"Start new conversation",exact:true}).click();await expect(dialog.getByRole("log")).not.toContainText("For a consultation");
  await page.screenshot({path:"/tmp/carebora-improved-assistant.png"});
});
test("clearing an in-flight chat cannot restore the old reply",async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let started!:()=>void;const held=new Promise<void>(resolve=>started=resolve);
  await page.route("**/api/v1/ai/navigate",async route=>{started();await gate;await route.fulfill({json:{data:{message:"Stale private reply",serviceIds:[],source:"guide"}}});});
  await page.goto("/");await page.getByRole("button",{name:"Open navigation assistant",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Care Bora navigation assistant"});
  try{
    await dialog.getByRole("textbox",{name:"Ask for help navigating"}).fill("Check my request");await dialog.getByRole("button",{name:"Send question",exact:true}).click();await held;
    await dialog.getByRole("button",{name:"Start new conversation",exact:true}).click();const response=page.waitForResponse(r=>r.url().endsWith("/ai/navigate"));release();await(await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await expect(dialog.getByRole("log")).not.toContainText("Stale private reply");await expect(dialog.getByRole("textbox",{name:"Ask for help navigating"})).toBeEnabled();
  }finally{release();}
});

test("logging out clears the conversation for the next person using the browser",async({page})=>{
  await page.context().addCookies([{name:"cb_access",value:token,url:test.info().project.use.baseURL!}]);
  await page.goto("/");await expect(page.getByRole("button",{name:"Open account menu",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Open navigation assistant",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Care Bora navigation assistant"});
  const ref=orderId.slice(0,8).toUpperCase();await dialog.getByRole("textbox",{name:"Ask for help navigating"}).fill(ref);await dialog.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(dialog.getByRole("link",{name:`Order #${ref}`,exact:false})).toBeVisible();await dialog.getByRole("button",{name:"Close assistant",exact:true}).click();
  await page.getByRole("button",{name:"Open account menu",exact:true}).click();await page.getByRole("button",{name:"Log out",exact:true}).click();await expect(page.getByRole("button",{name:"Open account menu",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Open navigation assistant",exact:true}).click();await expect(dialog.getByRole("log")).not.toContainText(ref);await expect(dialog.getByRole("link",{name:`Order #${ref}`,exact:false})).toHaveCount(0);
});

test("personal order help refreshes an expired session before looking up the order",async({page})=>{
  await page.context().addCookies([{name:"cb_access",value:token,url:test.info().project.use.baseURL!}]);
  await page.goto("/");await expect(page.getByRole("button",{name:"Open account menu",exact:true})).toBeVisible();await page.getByRole("button",{name:"Open navigation assistant",exact:true}).click();
  let profileRequests=0,refreshes=0;
  await page.route("**/api/v1/auth/me",route=>{profileRequests++;return route.fulfill(profileRequests===1?{status:401,json:{error:{code:"UNAUTHORIZED",message:"Expired access token"}}}:{json:{data:{id:patientId,role:"patient",fullName:"Assistant client",email:"assistant@carebora.test",emailVerified:true}}});});
  await page.route("**/api/v1/auth/refresh",route=>{refreshes++;return route.fulfill({json:{data:{refreshed:true}}});});
  const dialog=page.getByRole("dialog",{name:"Care Bora navigation assistant"});const reference=orderId.slice(0,8).toUpperCase();
  await dialog.getByRole("textbox",{name:"Ask for help navigating"}).fill(reference);await dialog.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(dialog.getByRole("link",{name:`Order #${reference}`,exact:false})).toBeVisible();expect(refreshes).toBe(1);expect(profileRequests).toBe(2);
});

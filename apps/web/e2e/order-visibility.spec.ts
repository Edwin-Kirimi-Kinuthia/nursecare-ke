import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@carebora/db";
import { signAccessToken } from "@carebora/core";

let patientId:string, vendorId:string, adminId:string, orgId:string, drugId:string;
let patientToken:string,vendorToken:string,adminToken:string;
const orderIds:string[]=[];
const image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0XcAAAAASUVORK5CYII=";
const headers=(token:string)=>({Authorization:`Bearer ${token}`});
test.beforeAll(async()=>{
  if (!["localhost","127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Disposable local database required");
  const tag=randomUUID();
  const patient=await db.user.create({data:{fullName:"Visibility client",email:`client-${tag}@carebora.test`,role:"patient"}});patientId=patient.id;
  const vendor=await db.user.create({data:{fullName:"Visibility vendor",email:`vendor-${tag}@carebora.test`,role:"vendor"}});vendorId=vendor.id;
  const admin=await db.user.create({data:{fullName:"Visibility admin",email:`admin-${tag}@carebora.test`,role:"admin"}});adminId=admin.id;
  const org=await db.organization.create({data:{name:"Visibility pharmacy",slug:tag,type:"pharmacy",status:"approved",members:{create:{userId:vendorId,role:"owner"}}}});orgId=org.id;
  const drug=await db.drug.create({data:{name:"Current catalogue name",category:"Visibility",imageUrl:image,images:[image,image,image]}});drugId=drug.id;
  const listing=await db.listing.create({data:{orgId,drugId,priceKes:99,stockQty:100}});
  for(let i=0;i<2;i++) {
    const order=await db.order.create({data:{patientId,totalKes:20,phoneNumber:"0712345678",deliveryAddress:"Test building",prescriptionImageUrl:image,createdAt:new Date("2020-01-01T00:00:00Z"),vendorOrders:{create:{orgId,subtotalKes:20,status:i===0?"pending":"delivered",createdAt:new Date("2020-01-01T00:00:00Z"),items:{create:{listingId:listing.id,drugName:"Purchased medicine",unitPriceKes:10,qty:2}}}}}});orderIds.push(order.id);
  }
  orderIds.sort().reverse();
  patientToken=await signAccessToken({sub:patientId,role:"patient"});vendorToken=await signAccessToken({sub:vendorId,role:"vendor"});adminToken=await signAccessToken({sub:adminId,role:"admin"});
});
test.afterAll(async()=>{
  if (!patientId) return;
  await db.order.deleteMany({where:{patientId}});await db.listing.deleteMany({where:{orgId}});await db.drug.delete({where:{id:drugId}});await db.organization.delete({where:{id:orgId}});await db.user.deleteMany({where:{id:{in:[patientId,vendorId,adminId]}}});
});

test("saved paid and unpaid orders paginate consistently without inline uploads or changed purchase snapshots",async({request})=>{
  for (const [url,token,field] of [["/api/v1/orders",patientToken,"orders"],["/api/v1/vendor/orders",vendorToken,"vendorOrders"]] as const) {
    const a=await request.get(`${url}?limit=1&offset=0`,{headers:headers(token)}),b=await request.get(`${url}?limit=1&offset=1`,{headers:headers(token)});
    expect(a.status()).toBe(200);expect(b.status()).toBe(200);
    const x=(await a.json()).data,y=(await b.json()).data;
    expect(x.total).toBe(2);expect(y.total).toBe(2);expect(x[field][0].id).not.toBe(y[field][0].id);
    expect(await a.text()).not.toContain("data:image");expect(await b.text()).not.toContain("data:image");
    const orders=field==="orders"?[...x[field],...y[field]].flatMap(o=>o.vendorOrders):[...x[field],...y[field]];
    expect(orders.map(o=>o.status).sort()).toEqual(["delivered","pending"]);
    for(const order of orders) expect(order.items[0]).toMatchObject({drugName:"Purchased medicine",qty:2,unitPriceKes:10});
  }
  const detail=await request.get(`/api/v1/orders/${orderIds[0]}`,{headers:headers(adminToken)});
  expect(detail.status()).toBe(200);expect(await detail.text()).not.toContain("data:image");
  expect((await db.drug.findUniqueOrThrow({where:{id:drugId}})).imageUrl).toBe(image);
  expect((await db.order.findUniqueOrThrow({where:{id:orderIds[0]}})).prescriptionImageUrl).toBe(image);
});

test("all dashboard order pages are reachable and the selected Orders tab survives reload",async({page,request})=>{
  const source=(await (await request.get(`/api/v1/orders?limit=50`,{headers:headers(patientToken)})).json()).data.orders[0];
  const vendorSource=(await (await request.get(`/api/v1/vendor/orders?limit=50`,{headers:headers(vendorToken)})).json()).data.vendorOrders[0];
  const ids=Array.from({length:51},()=>randomUUID());
  const orders=ids.map(id=>({...source,id,vendorOrders:source.vendorOrders.map((v:object)=>({...v,orderId:id}))}));
  for(const [path,token,endpoint,field] of [["/admin",adminToken,"admin/orders","orders"],["/vendor?tab=orders",vendorToken,"vendor/orders","vendorOrders"],["/orders",patientToken,"orders","orders"]] as const) {
    await page.context().clearCookies();await page.context().addCookies([{name:"cb_access",value:token,url:test.info().project.use.baseURL!}]);
    const requested:number[]=[];
    await page.route(`**/api/v1/${endpoint}?*`,async route=>{const offset=Number(new URL(route.request().url()).searchParams.get("offset")??0);requested.push(offset);const rows=field==="vendorOrders"?orders.map(o=>({...vendorSource,id:randomUUID(),orderId:o.id})):orders;await route.fulfill({json:{data:{[field]:rows.slice(offset,offset+50),total:51,limit:50,offset}}});});
    await page.goto(path);
    if(path==="/admin") {await page.getByRole("button",{name:"Open pharmacy orders",exact:true}).click();await expect(page).toHaveURL(/tab=orders/);}
    const ref=ids[50].slice(0,8).toUpperCase();
    await page.getByRole("button",{name:"Older orders",exact:true}).click();
    await expect(page.getByRole("link",{name:new RegExp(`Order #${ref}`)})).toBeVisible();expect(requested).toContain(50);
    if(path!=="/orders") {await page.reload();await expect(page.getByRole("button",{name:"Refresh orders",exact:true})).toBeVisible();}
    await page.unroute(`**/api/v1/${endpoint}?*`);
  }
});

test("slow, failed and stale refreshes cannot hide the latest visible orders",async({page,request})=>{
  const source=(await (await request.get(`/api/v1/orders?limit=50`,{headers:headers(patientToken)})).json()).data.orders[0];
  const recent={...source,id:randomUUID()};
  const oldBody={data:{orders:[source],total:1,limit:50,offset:0}},freshBody={data:{orders:[recent,source],total:2,limit:50,offset:0}};
  let phase="initial";let release!:()=>void,started!:()=>void;
  const gate=new Promise<void>(resolve=>release=resolve),held=new Promise<void>(resolve=>started=resolve);
  await page.route("**/api/v1/admin/orders?*",async route=>{
    const mode=phase;
    if(mode==="hold") {started();await gate;await route.fulfill({json:oldBody,headers:{"x-stale-test":"1"}});}
    else if(mode==="fail") await route.fulfill({status:503,json:{error:{code:"SERVICE_UNAVAILABLE",message:"Test refresh failure"}}});
    else await route.fulfill({json:mode==="fresh"?freshBody:oldBody});
  });
  await page.context().addCookies([{name:"cb_access",value:adminToken,url:test.info().project.use.baseURL!}]);
  await page.goto("/admin?tab=orders");
  const old=page.getByRole("article",{name:`Pharmacy order ${source.id.slice(0,8).toUpperCase()}`,exact:true}),latest=page.getByRole("article",{name:`Pharmacy order ${recent.id.slice(0,8).toUpperCase()}`,exact:true});
  try {
    await expect(old).toBeVisible();phase="hold";await page.getByRole("button",{name:"Refresh orders",exact:true}).click();await held;await expect(old).toBeVisible();
    phase="fresh";await page.getByRole("button",{name:"Refresh orders",exact:true}).click();await expect(latest).toBeVisible();
    const response=page.waitForResponse(r=>r.headers()["x-stale-test"]==="1");release();await(await response).finished();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await expect(latest).toBeVisible();
    phase="fail";await page.getByRole("button",{name:"Refresh orders",exact:true}).click();await expect(page.getByRole("alert").filter({hasText:"Could not refresh orders"})).toBeVisible();await expect(latest).toBeVisible();
  } finally {release();}
});

test("admin personal purchases distinguish customer sales without changing order ownership",async({page,request})=>{
  const personal=await request.get("/api/v1/orders?limit=50",{headers:headers(adminToken)});
  expect((await personal.json()).data.total).toBe(0);
  const source=(await (await request.get("/api/v1/orders?limit=50",{headers:headers(patientToken)})).json()).data.orders[0];
  await page.route("**/api/v1/admin/orders?*",route=>route.fulfill({json:{data:{orders:[source],total:1,limit:50,offset:0}}}));
  await page.context().addCookies([{name:"cb_access",value:adminToken,url:test.info().project.use.baseURL!}]);
  await page.goto("/orders");
  await expect(page.getByRole("heading",{name:"My pharmacy purchases",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"View pharmacy sales orders",exact:true}).click();
  await expect(page).toHaveURL(/admin\?tab=orders/);
  await expect(page.getByRole("article",{name:`Pharmacy order ${source.id.slice(0,8).toUpperCase()}`,exact:true})).toBeVisible();
  expect((await db.order.findUniqueOrThrow({where:{id:source.id}})).patientId).toBe(patientId);
});

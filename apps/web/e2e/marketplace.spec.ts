import { seededSession } from "./support/auth";
import { test, expect } from "@playwright/test";

/**
 * Multi-vendor marketplace E2E — a cart spanning two independent pharmacy
 * orgs becomes ONE checkout (one Order, one Payment) that fans out into ONE
 * VendorOrder per org. Each vendor sees and can only act on its own slice.
 */

const UNIQUE = Date.now();
const PASSWORD = "Test12345!";

test.describe.configure({ mode: "serial" });

let adminToken = "";
let vendorAToken = "";
let vendorBToken = "";
let listingAId = "";
let listingBId = "";
let patientToken = "";
let orderId = "";
let vendorOrderAId = "";
let vendorOrderBId = "";
let gatewayRef = "";
let paymentId = "";

async function createApprovedVendor(request: import("@playwright/test").APIRequestContext, label: "A" | "B", drugName: string, priceKes: number) {
  const email = `mkt-vendor-${label}+${UNIQUE}@carebora.test`;
  const applyRes = await request.post("/api/v1/vendors/apply", {
    data: {
      fullName: `E2E Vendor ${label}`,
      email,
      password: PASSWORD,
      orgType: "pharmacy",
      orgName: `E2E Marketplace Pharmacy ${label} ${UNIQUE}`,
      licenceNumber: `PPB-MKT-${label}-${UNIQUE}`,
      branch: { name: "Main Branch", county: "Nairobi", latitude: -1.2864, longitude: 36.8172 },
    },
  });
  expect(applyRes.status()).toBe(201);
  const { data } = await applyRes.json();
  const token = data.accessToken;

  const orgRes = await request.get("/api/v1/vendor/org", { headers: { Authorization: `Bearer ${token}` } });
  const orgId = (await orgRes.json()).data.id;

  const approveRes = await request.post(`/api/v1/admin/organizations/${orgId}/review`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { status: "approved" },
  });
  expect(approveRes.status()).toBe(200);

  const listingRes = await request.post("/api/v1/vendor/listings", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      drug: { name: drugName, form: "tablet", category: "Pain Relief", requiresPrescription: false },
      priceKes,
      stockQty: 50,
    },
  });
  expect(listingRes.status()).toBe(201);
  const listingId = (await listingRes.json()).data.id;

  return { token, orgId, listingId };
}

test.describe("Multi-vendor cart split", () => {
  test("login admin", async () => {
    adminToken = (await seededSession("admin@carebora.ke")).accessToken;
  });

  test("onboard two approved vendors with distinct listings", async ({ request }) => {
    const a = await createApprovedVendor(request, "A", `E2E Marketplace Drug A ${UNIQUE}`, 120);
    vendorAToken = a.token;
    listingAId = a.listingId;

    const b = await createApprovedVendor(request, "B", `E2E Marketplace Drug B ${UNIQUE}`, 340);
    vendorBToken = b.token;
    listingBId = b.listingId;
  });

  test("register patient", async ({ request }) => {
    const res = await request.post("/api/v1/auth/register", {
      data: { email: `mkt-patient+${UNIQUE}@carebora.test`, password: PASSWORD, fullName: "E2E Marketplace Shopper", role: "patient" },
    });
    expect(res.status()).toBe(201);
    patientToken = (await res.json()).data.accessToken;
  });

  test("checkout with items from both vendors in one cart", async ({ request }) => {
    const res = await request.post("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: {
        items: [
          { listingId: listingAId, qty: 2 }, // 240
          { listingId: listingBId, qty: 1 }, // 340
        ],
        phoneNumber: "0712345678",
        deliveryAddress: "Test Address, Nairobi",
        deliveryNotes: "Ring the front door bell",
      },
    });
    expect(res.status()).toBe(201);
    const { data } = await res.json();
    orderId = data.id;

    expect(data.vendorOrders.length).toBe(2);
    const orgNames = data.vendorOrders.map((vo: { organization: { name: string } }) => vo.organization.name).sort();
    expect(orgNames[0]).toContain("E2E Marketplace Pharmacy A");
    expect(orgNames[1]).toContain("E2E Marketplace Pharmacy B");

    // One payment for the whole cart.
    expect(data.payment.amountKes).toBe(240 + 340);
    gatewayRef = data.payment.gatewayRef;
    paymentId = data.payment.id;

    const voA = data.vendorOrders.find((vo: { organization: { name: string } }) => vo.organization.name.includes("Pharmacy A"));
    const voB = data.vendorOrders.find((vo: { organization: { name: string } }) => vo.organization.name.includes("Pharmacy B"));
    vendorOrderAId = voA.id;
    vendorOrderBId = voB.id;
  });

  test("vendor A sees only its own vendor order, not vendor B's", async ({ request }) => {
    const res = await request.get("/api/v1/vendor/orders", {
      headers: { Authorization: `Bearer ${vendorAToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const ids = data.vendorOrders.map((vo: { id: string }) => vo.id);
    expect(ids).toContain(vendorOrderAId);
    expect(ids).not.toContain(vendorOrderBId);
  });

  test("vendor and admin APIs expose purchased contents without leaking another vendor's items", async ({ request }) => {
    const vendor = await request.get("/api/v1/vendor/orders", { headers: { Authorization: `Bearer ${vendorAToken}` } });
    const a = (await vendor.json()).data.vendorOrders.find((o: { id: string }) => o.id === vendorOrderAId);
    expect(a.items).toHaveLength(1);
    expect(a.items[0]).toMatchObject({ drugName: `E2E Marketplace Drug A ${UNIQUE}`, qty: 2, unitPriceKes: 120 });
    expect(a.order).toMatchObject({ phoneNumber: "0712345678", deliveryNotes: "Ring the front door bell", payment: { status: "pending" } });
    expect(JSON.stringify(a)).not.toContain(`E2E Marketplace Drug B ${UNIQUE}`);
    expect(a.order.payment.amountKes).toBeUndefined();
    for (const token of [vendorAToken, vendorBToken]) {
      await expect.poll(async () => {
        const res = await request.get("/api/v1/notifications", { headers: { Authorization: `Bearer ${token}` } });
        return (await res.json()).data.notifications.filter((n: { type: string }) => n.type === "pharmacy_order_requested").length;
      }).toBe(1);
    }
    for (const token of [vendorAToken, vendorBToken]) {
      const notifications = (await (await request.get("/api/v1/notifications", {headers:{Authorization:`Bearer ${token}`}})).json()).data.notifications;
      expect(notifications.filter((n:{type:string})=>n.type === "pharmacy_order_requested").every((n:{link:string})=>n.link === "/vendor?tab=orders")).toBe(true);
    }
    const admin = await request.get("/api/v1/admin/orders", { headers: { Authorization: `Bearer ${adminToken}` } });
    const order = (await admin.json()).data.orders.find((o: { id: string }) => o.id === orderId);
    expect(order.vendorOrders.flatMap((vo: { items: object[] }) => vo.items)).toHaveLength(2);
  });

  test("pharmacy detail tabs and admin dashboard show medicines, quantities, prices and delivery instructions", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [token, route, names] of [
      [vendorAToken, "/vendor", [`E2E Marketplace Drug A ${UNIQUE}`]],
      [vendorBToken, "/vendor", [`E2E Marketplace Drug B ${UNIQUE}`]],
      [adminToken, "/admin", [`E2E Marketplace Drug A ${UNIQUE}`, `E2E Marketplace Drug B ${UNIQUE}`]],
    ] as const) {
      await page.context().clearCookies();
      await page.context().addCookies([{ name: "cb_access", value: token, url: test.info().project.use.baseURL! }]);
      await page.goto(route);
      await page.getByRole("button", { name: "Orders", exact: true }).click();
      const reference = orderId;
      const card = page.getByRole("article", { name: `Pharmacy order ${reference.slice(0, 8).toUpperCase()}`, exact: true });
      await expect(card.getByText(`Order #${orderId.slice(0,8).toUpperCase()} ↗`, {exact:true})).toBeVisible();
      for (const name of names) await expect(card.getByText(name,{exact:true})).toBeVisible();
      const detail = route === "/vendor" ? (await Promise.all([page.waitForEvent("popup"), card.getByRole("link").click()]))[0] : page;
      const contents = route === "/vendor" ? detail.getByRole("article") : card;
      for (const name of names) await expect(contents.getByText(name, { exact: true })).toBeVisible();
      await expect(contents.getByText(/(?:Delivery notes|Notes): Ring the front door bell/)).toBeVisible();
      await expect(contents.getByText("Contact: 0712345678", { exact: true })).toBeVisible();
      if (token !== vendorBToken) await expect(contents.getByText(/Quantity: 2.*120.*each/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh orders", exact: true })).toBeVisible();
      await expect(detail.getByRole("button", { name: "Mark processing", exact: true })).toHaveCount(0);
      if (route === "/vendor") {
        const hidden = token === vendorAToken ? "B" : "A";
        await expect(detail.getByText(`E2E Marketplace Drug ${hidden} ${UNIQUE}`, { exact: true })).toHaveCount(0);
      }
      expect(await detail.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (detail !== page) await detail.close();
    }
  });

  test("vendor A cannot patch vendor B's slice of the order", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/orders/${vendorOrderBId}`, {
      headers: { Authorization: `Bearer ${vendorAToken}` },
      data: { status: "processing" },
    });
    expect(res.status()).toBe(404);
  });

  test("vendor B cannot advance its slice before the cart is paid", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/orders/${vendorOrderBId}`, {
      headers: { Authorization: `Bearer ${vendorBToken}` },
      data: { status: "processing" },
    });
    expect(res.status()).toBe(400);
  });

  test("patient pays for the whole cart (one payment settles both vendor orders)", async ({ request }) => {
    // Till submit + admin approve — not the dev-only /mpesa/simulate helper,
    // which is unreachable once the app runs as a production build (`next
    // start` hardcodes NODE_ENV=production regardless of other env vars, and
    // CI's e2e job runs the production build, exactly like a real deploy).
    const submitRes = await request.post("/api/v1/payments/till/submit", {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { gatewayRef, code: "MKTPAY01" },
    });
    expect(submitRes.status()).toBe(200);

    const approveRes = await request.post("/api/v1/admin/payments/verifications", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { id: paymentId, approve: true },
    });
    expect(approveRes.status()).toBe(200);
  });

  test("vendor B can advance its own slice", async ({ request }) => {
    const res = await request.patch(`/api/v1/vendor/orders/${vendorOrderBId}`, {
      headers: { Authorization: `Bearer ${vendorBToken}` },
      data: { status: "processing" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).data.status).toBe("processing");
  });

  test("the patient sees both vendor slices under the one order", async ({ request }) => {
    const res = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status()).toBe(200);
    const { data } = await res.json();
    const order = data.orders.find((o: { id: string }) => o.id === orderId);
    expect(order.vendorOrders.length).toBe(2);
  });
});

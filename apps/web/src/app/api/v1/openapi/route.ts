import { NextResponse } from "next/server";
import generated from "./generated.json";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const bearerAuth = { bearerAuth: [] };

type Op = Record<string, unknown>;
type PathItem = Record<string, Op>;

/**
 * Stable, unique function names for SDK generators: GET /providers/{providerId}/slots
 * becomes getProvidersByProviderIdSlots. Derived from the route so it never
 * has to be maintained by hand and can't collide.
 */
function operationId(method: string, path: string) {
  const words = path
    .split("/")
    .filter(Boolean)
    .flatMap((seg) => {
      const param = /^\{(.+)\}$/.exec(seg);
      return param ? ["by", param[1]!] : seg.split(/[-_]/);
    });
  return method.toLowerCase() + words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

/** "/appointments/{appointmentId}" and "/appointments/{id}" are the same route. */
const shape = (path: string) => path.replace(/\{[^}]+\}/g, "{}");

/**
 * Combine the hand-written spec with the one generated from the route files.
 *
 * The hand-written entries carry curated wording, so their summary, description
 * and tags are kept. Everything that can be wrong or missing there — the request
 * body, query and path parameters, the auth requirement — comes from the
 * generated side, because that is read from the code. An endpoint that exists
 * only in the code (every one added since the spec was written) appears as
 * generated, so nothing is undocumented.
 */
function mergePaths(hand: Record<string, PathItem>, gen: Record<string, PathItem>): Record<string, PathItem> {
  const handByShape = new Map<string, [string, PathItem]>();
  for (const [path, item] of Object.entries(hand)) handByShape.set(shape(path), [path, item]);

  const out: Record<string, PathItem> = {};
  for (const [path, genItem] of Object.entries(gen)) {
    const handItem = handByShape.get(shape(path))?.[1] ?? {};
    out[path] = {};
    for (const [method, g] of Object.entries(genItem)) {
      const h = handItem[method];
      out[path]![method] = h
        ? {
            ...g,
            operationId: operationId(method, path),
            ...(h.summary ? { summary: h.summary } : {}),
            ...(h.description ? { description: h.description } : {}),
            ...(h.tags ? { tags: h.tags } : {}),
            responses: { ...(g.responses as object), ...(h.responses as object) },
            ...(g.requestBody ? {} : h.requestBody ? { requestBody: h.requestBody } : {}),
          }
        : { ...g, operationId: operationId(method, path) };
    }
  }
  return out;
}

/** GET /api/v1/openapi — machine-readable OpenAPI 3.0 spec for all CareBora endpoints. */
export function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "CareBora API",
      version: "1.0.0",
      description:
        "API-first Kenyan telehealth platform. Covers auth, provider marketplace, " +
        "teleconsultation, M-Pesa/Jenga payments, a multi-vendor pharmacy marketplace, " +
        "ambulance dispatch, patient medical records, lab orders, home-based care, and admin ops.",
      contact: { name: "CareBora", email: "dev@carebora.ke" },
    },
    servers: [{ url: `${BASE}/api/v1`, description: "CareBora v1" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: { code: { type: "string" }, message: { type: "string" } },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            fullName: { type: "string" },
            phone: { type: "string", nullable: true },
            role: { type: "string", enum: ["patient", "doctor", "nurse", "physio", "pharmacy", "vendor", "admin"] },
            avatarUrl: { type: "string", nullable: true },
            emailVerified: { type: "boolean" },
            phoneVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      // ── Health ─────────────────────────────────────────────────────────────
      "/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          responses: {
            200: { description: "Service is up", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, db: { type: "string" }, time: { type: "string" } } } } } },
          },
        },
      },

      // ── Auth ───────────────────────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new account",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["email", "password", "fullName", "role"], properties: { email: { type: "string" }, password: { type: "string", minLength: 8 }, fullName: { type: "string" }, role: { type: "string" }, phone: { type: "string" } } } } },
          },
          responses: { 201: { description: "Registered; access + refresh tokens set as cookies" }, 409: { description: "Email already exists" } },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
          responses: { 200: { description: "Login successful; tokens set as cookies" }, 401: { description: "Invalid credentials" } },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user",
          security: [bearerAuth],
          responses: { 200: { description: "Current user profile", content: { "application/json": { schema: { "$ref": "#/components/schemas/User" } } } } },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          responses: { 200: { description: "New token pair issued" }, 401: { description: "Invalid or expired refresh token" } },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout (revoke session)",
          security: [bearerAuth],
          responses: { 200: { description: "Session revoked" } },
        },
      },

      // ── Profiles ───────────────────────────────────────────────────────────
      "/patients/me/profile": {
        get: { tags: ["Profiles"], summary: "Get patient profile", security: [bearerAuth], responses: { 200: { description: "Patient profile" } } },
        patch: { tags: ["Profiles"], summary: "Update patient profile", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/providers/me/profile": {
        get: { tags: ["Profiles"], summary: "Get own provider profile", security: [bearerAuth], responses: { 200: { description: "Provider profile" } } },
        patch: { tags: ["Profiles"], summary: "Update provider profile", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      },

      // ── Provider Directory ─────────────────────────────────────────────────
      "/providers": {
        get: {
          tags: ["Providers"],
          summary: "Browse provider directory",
          parameters: [
            { name: "specialty", in: "query", schema: { type: "string" } },
            { name: "county", in: "query", schema: { type: "string" } },
            { name: "appointmentType", in: "query", schema: { type: "string", enum: ["teleconsult", "home_visit"] } },
            { name: "verificationStatus", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: { 200: { description: "Paginated provider list" } },
        },
      },
      "/providers/{providerId}": {
        get: { tags: ["Providers"], summary: "Get provider public profile", parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "Provider profile" }, 404: { description: "Not found" } } },
      },
      "/providers/{providerId}/availability": {
        get: { tags: ["Availability"], summary: "List provider availability rules", security: [bearerAuth], parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Availability rules" } } },
        post: { tags: ["Availability"], summary: "Create availability rule (provider)", security: [bearerAuth], parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["appointmentType", "dayOfWeek", "startMinute", "endMinute"], properties: { appointmentType: { type: "string" }, dayOfWeek: { type: "integer", minimum: 0, maximum: 6 }, startMinute: { type: "integer" }, endMinute: { type: "integer" }, slotDuration: { type: "integer", default: 30 } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/providers/{providerId}/slots": {
        get: { tags: ["Availability"], summary: "List bookable slots", parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string" } }, { name: "from", in: "query", schema: { type: "string", format: "date-time" } }, { name: "to", in: "query", schema: { type: "string", format: "date-time" } }], responses: { 200: { description: "Slot list" } } },
        post: { tags: ["Availability"], summary: "Create slot manually (provider)", security: [bearerAuth], parameters: [{ name: "providerId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 201: { description: "Created" } } },
      },

      // ── Appointments ───────────────────────────────────────────────────────
      "/appointments": {
        get: { tags: ["Appointments"], summary: "List appointments", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "offset", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Appointments" } } },
        post: { tags: ["Appointments"], summary: "Book appointment (patient)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["slotId", "appointmentType"], properties: { slotId: { type: "string", format: "uuid" }, appointmentType: { type: "string" }, patientNotes: { type: "string" } } } } } }, responses: { 201: { description: "Appointment created" } } },
      },
      "/appointments/{appointmentId}": {
        get: { tags: ["Appointments"], summary: "Get appointment", security: [bearerAuth], parameters: [{ name: "appointmentId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Appointment detail" } } },
        patch: { tags: ["Appointments"], summary: "Update appointment status", security: [bearerAuth], parameters: [{ name: "appointmentId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/appointments/{appointmentId}/consultation": {
        post: { tags: ["Consultations"], summary: "Start teleconsultation (provider)", security: [bearerAuth], parameters: [{ name: "appointmentId", in: "path", required: true, schema: { type: "string" } }], responses: { 201: { description: "Consultation created" } } },
      },

      // ── Consultations ──────────────────────────────────────────────────────
      "/consultations/{consultationId}": {
        get: { tags: ["Consultations"], summary: "Get consultation", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Consultation" } } },
        patch: { tags: ["Consultations"], summary: "Update consultation (clinical notes, status)", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/consultations/{consultationId}/token": {
        post: { tags: ["Consultations"], summary: "Get LiveKit room token", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { displayName: { type: "string" } } } } } }, responses: { 200: { description: "LiveKit token + roomName + url" } } },
      },
      "/consultations/{consultationId}/messages": {
        get: { tags: ["Consultations"], summary: "List chat messages", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Messages" } } },
        post: { tags: ["Consultations"], summary: "Send chat message", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } } } } }, responses: { 201: { description: "Message created" } } },
      },
      "/consultations/{consultationId}/prescriptions": {
        get: { tags: ["Prescriptions"], summary: "List prescriptions for consultation", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Prescriptions" } } },
        post: { tags: ["Prescriptions"], summary: "Issue prescription (provider)", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["medications"], properties: { medications: { type: "array", items: { type: "object" } }, instructions: { type: "string" }, expiresAt: { type: "string", format: "date-time" } } } } } }, responses: { 201: { description: "Prescription created" } } },
      },
      "/consultations/{consultationId}/prescriptions/{prescriptionId}/pdf": {
        get: { tags: ["Prescriptions"], summary: "Download prescription PDF", security: [bearerAuth], parameters: [{ name: "consultationId", in: "path", required: true, schema: { type: "string" } }, { name: "prescriptionId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "PDF file", content: { "application/pdf": {} } } } },
      },

      // ── Payments ───────────────────────────────────────────────────────────
      "/payments/mpesa/stk": {
        post: { tags: ["Payments"], summary: "Initiate M-Pesa STK push for appointment", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["appointmentId", "phoneNumber"], properties: { appointmentId: { type: "string", format: "uuid" }, phoneNumber: { type: "string" } } } } } }, responses: { 200: { description: "STK push initiated" } } },
      },
      "/payments/mpesa/callback": {
        post: { tags: ["Payments"], summary: "Daraja webhook (Safaricom → CareBora)", responses: { 200: { description: "Acknowledged" } } },
      },
      "/payments": {
        get: { tags: ["Payments"], summary: "List payments for current user", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Payments" } } },
      },
      "/payments/{paymentId}": {
        get: { tags: ["Payments"], summary: "Get payment detail", security: [bearerAuth], parameters: [{ name: "paymentId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Payment" } } },
      },
      "/payments/{paymentId}/refund": {
        post: { tags: ["Payments"], summary: "Refund payment (provider or admin)", security: [bearerAuth], parameters: [{ name: "paymentId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Refunded" } } },
      },

      // ── Pharmacy marketplace (multi-vendor) ───────────────────────────────
      // The catalogue (Drug) is split from a vendor's offer of it (Listing) —
      // many pharmacies can sell the same drug at different prices/stock.
      "/storefront/drugs": {
        get: { tags: ["Pharmacy"], summary: "Browse the drug catalogue, ranked by distance (or price with no location)", parameters: [{ name: "category", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "requiresPrescription", in: "query", schema: { type: "boolean" } }, { name: "lat", in: "query", schema: { type: "number" } }, { name: "lng", in: "query", schema: { type: "number" } }, { name: "county", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "offset", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Drugs with bestPriceKes, vendorCount, nearestVendor" } } },
      },
      "/storefront/drugs/{drugId}": {
        get: { tags: ["Pharmacy"], summary: "Get canonical drug detail", parameters: [{ name: "drugId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Drug" }, 404: { description: "Not found" } } },
      },
      "/storefront/drugs/{drugId}/offers": {
        get: { tags: ["Pharmacy"], summary: "List every vendor's offer of a drug, ranked by distance then price", parameters: [{ name: "drugId", in: "path", required: true, schema: { type: "string" } }, { name: "lat", in: "query", schema: { type: "number" } }, { name: "lng", in: "query", schema: { type: "number" } }], responses: { 200: { description: "Offers" } } },
      },
      "/orders": {
        get: { tags: ["Pharmacy"], summary: "List checkouts for current user", security: [bearerAuth], parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }, { name: "offset", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Orders" } } },
        post: { tags: ["Pharmacy"], summary: "Checkout a cart (may span multiple vendors) + initiate payment (patient)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["items", "phoneNumber", "deliveryAddress"], properties: { items: { type: "array", items: { type: "object", required: ["listingId", "qty"], properties: { listingId: { type: "string", format: "uuid" }, qty: { type: "integer" } } } }, phoneNumber: { type: "string" }, deliveryAddress: { type: "string" }, deliveryNotes: { type: "string" }, prescriptionId: { type: "string" }, prescriptionImage: { type: "string" } } } } } }, responses: { 201: { description: "Order created — one Payment, fanned out into one VendorOrder per org" } } },
      },
      "/vendor/listings": {
        get: { tags: ["Vendor"], summary: "List this org's catalogue offers", security: [bearerAuth], responses: { 200: { description: "Listings" } } },
        post: { tags: ["Vendor"], summary: "Claim an existing drug, or add a new one and claim it (owner/manager)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["priceKes"], properties: { drugId: { type: "string", format: "uuid" }, drug: { type: "object" }, priceKes: { type: "integer" }, stockQty: { type: "integer" } } } } } }, responses: { 201: { description: "Listing created" } } },
      },
      "/vendor/orders": {
        get: { tags: ["Vendor"], summary: "List this org's slice of every checkout it's part of", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Vendor orders" } } },
      },
      "/vendor/orders/{vendorOrderId}": {
        patch: { tags: ["Vendor"], summary: "Advance fulfilment status, or cancel", security: [bearerAuth], parameters: [{ name: "vendorOrderId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["processing", "dispatched", "delivered", "cancelled"] } } } } } }, responses: { 200: { description: "Updated" } } },
      },

      // ── Vendor onboarding & organizations ─────────────────────────────────
      "/vendors/apply": {
        post: { tags: ["Organizations"], summary: "Apply to join as a vendor business — pharmacy, ambulance, or lab (pending admin review)", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["fullName", "email", "password", "orgType", "orgName", "licenceNumber", "branch"], properties: { fullName: { type: "string" }, email: { type: "string" }, password: { type: "string" }, orgType: { type: "string", enum: ["pharmacy", "ambulance", "lab", "clinic"] }, orgName: { type: "string" }, licenceNumber: { type: "string" }, branch: { type: "object" } } } } } }, responses: { 201: { description: "Vendor user + pending Organization created" }, 409: { description: "Email already exists" } } },
      },
      "/vendor/org": {
        get: { tags: ["Organizations"], summary: "Get the caller's organization (branches + members)", security: [bearerAuth], responses: { 200: { description: "Organization" } } },
        patch: { tags: ["Organizations"], summary: "Update org details (owner/manager)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/vendor/branches": {
        get: { tags: ["Organizations"], summary: "List this org's branches", security: [bearerAuth], responses: { 200: { description: "Branches" } } },
        post: { tags: ["Organizations"], summary: "Add a branch (owner/manager)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "county", "latitude", "longitude"] } } } }, responses: { 201: { description: "Branch created" } } },
      },
      "/vendor/members": {
        get: { tags: ["Organizations"], summary: "List this org's team members", security: [bearerAuth], responses: { 200: { description: "Members" } } },
        post: { tags: ["Organizations"], summary: "Invite a team member by email (owner/manager)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "role"] } } } }, responses: { 201: { description: "Member added" } } },
      },
      "/admin/organizations": {
        get: { tags: ["Admin"], summary: "List vendor businesses (review queue + management)", security: [bearerAuth], parameters: [{ name: "type", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Organizations" } } },
      },
      "/admin/organizations/{orgId}/review": {
        post: { tags: ["Admin"], summary: "Approve, reject, suspend, or re-review a vendor business; optional commission override", security: [bearerAuth], parameters: [{ name: "orgId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["in_review", "approved", "rejected", "suspended"] }, notes: { type: "string" }, commissionPercent: { type: "integer" } } } } } }, responses: { 200: { description: "Reviewed" } } },
      },

      // ── Ambulance ──────────────────────────────────────────────────────────
      "/ambulance-requests": {
        get: { tags: ["Ambulance"], summary: "List the authenticated patient's own requests", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Requests" } } },
        post: { tags: ["Ambulance"], summary: "Request an ambulance (patient) — nearby operators are found by PostGIS proximity", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["pickupAddress", "pickupCounty", "pickupLatitude", "pickupLongitude", "patientCondition", "contactPhone"], properties: { type: { type: "string", enum: ["basic", "advanced_life_support", "icu", "neonatal", "mortuary"] }, urgency: { type: "string", enum: ["routine", "urgent", "emergency"] }, pickupAddress: { type: "string" }, pickupCounty: { type: "string" }, pickupLatitude: { type: "number" }, pickupLongitude: { type: "number" }, patientCondition: { type: "string" }, contactPhone: { type: "string" } } } } } }, responses: { 201: { description: "Request created (status: requested)" } } },
      },
      "/ambulance-requests/{requestId}": {
        get: { tags: ["Ambulance"], summary: "Get a request with its full status timeline", security: [bearerAuth], parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Request + events" } } },
        patch: { tags: ["Ambulance"], summary: "Cancel a request (patient, before dispatch)", security: [bearerAuth], parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { cancelReason: { type: "string" } } } } } }, responses: { 200: { description: "Cancelled" } } },
      },
      "/ambulance-requests/{requestId}/pay": {
        post: { tags: ["Ambulance"], summary: "Pay for a completed trip once the operator has set a fee (patient)", security: [bearerAuth], parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["phoneNumber"], properties: { phoneNumber: { type: "string" } } } } } }, responses: { 202: { description: "Payment initiated" }, 400: { description: "Not completed yet, or fee not set" } } },
      },
      "/vendor/ambulance-requests": {
        get: { tags: ["Ambulance"], summary: "This operator's dispatch queue", security: [bearerAuth], parameters: [{ name: "lat", in: "query", schema: { type: "number" } }, { name: "lng", in: "query", schema: { type: "number" } }], responses: { 200: { description: "Requests" } } },
      },
      "/vendor/ambulance-requests/{requestId}/accept": {
        post: { tags: ["Ambulance"], summary: "Accept a request — first operator to accept wins", security: [bearerAuth], parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { ambulanceId: { type: "string" }, estimatedKes: { type: "integer" } } } } } }, responses: { 200: { description: "Accepted" }, 409: { description: "Already accepted by another operator" } } },
      },
      "/vendor/ambulance-requests/{requestId}": {
        patch: { tags: ["Ambulance"], summary: "Advance the dispatch status timeline, or set the fee", security: [bearerAuth], parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["dispatched", "en_route_pickup", "arrived_pickup", "en_route_destination", "completed"] }, feeKes: { type: "integer" }, note: { type: "string" } } } } } }, responses: { 200: { description: "Updated" }, 400: { description: "Invalid status transition" } } },
      },
      "/vendor/ambulances": {
        get: { tags: ["Ambulance"], summary: "List this org's fleet", security: [bearerAuth], responses: { 200: { description: "Ambulances" } } },
        post: { tags: ["Ambulance"], summary: "Add a vehicle to the fleet", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["plateNumber", "type"], properties: { plateNumber: { type: "string" }, type: { type: "string" }, crewSize: { type: "integer" }, equipment: { type: "array", items: { type: "string" } } } } } } }, responses: { 201: { description: "Created" } } },
      },

      // ── Medical records (EMR) ─────────────────────────────────────────────
      // Every read goes through one access-control choke point: the patient
      // always; a provider with a care relationship; a grantee; an admin only
      // with an explicit break-glass reason. Every outcome is logged.
      "/records/{patientId}": {
        get: { tags: ["Records"], summary: "Get a patient's full record (allergies, conditions, medications, vitals, immunizations, documents, consultations)", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }, { name: "reason", in: "query", schema: { type: "string" }, description: "Required for admin access (break-glass) — always logged" }], responses: { 200: { description: "Record" }, 400: { description: "Admin access requires a reason" }, 403: { description: "No relationship, grant, or reason — denial is logged" } } },
      },
      "/records/{patientId}/allergies": {
        post: { tags: ["Records"], summary: "Add an allergy", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["substance"], properties: { substance: { type: "string" }, severity: { type: "string", enum: ["mild", "moderate", "severe"] }, reaction: { type: "string" } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/records/{patientId}/conditions": {
        post: { tags: ["Records"], summary: "Add a condition", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, icd10Code: { type: "string" }, status: { type: "string", enum: ["active", "resolved", "chronic"] } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/records/{patientId}/medications": {
        post: { tags: ["Records"], summary: "Add a medication entry", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, dosage: { type: "string" }, frequency: { type: "string" } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/records/{patientId}/vitals": {
        post: { tags: ["Records"], summary: "Record a vital sign", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "value"], properties: { type: { type: "string" }, value: { type: "string" }, unit: { type: "string" } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/records/{patientId}/immunizations": {
        post: { tags: ["Records"], summary: "Add an immunization record", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["vaccine", "administeredAt"], properties: { vaccine: { type: "string" }, doseNumber: { type: "integer" }, administeredAt: { type: "string", format: "date-time" } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/records/{patientId}/documents": {
        post: { tags: ["Records"], summary: "Upload a medical document (lab result, imaging, discharge summary, etc.)", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "fileUrl"], properties: { type: { type: "string" }, title: { type: "string" }, fileUrl: { type: "string" } } } } } }, responses: { 201: { description: "Created" } } },
      },
      "/records/{patientId}/grants": {
        get: { tags: ["Records"], summary: "List who the patient has given standing access to", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Grants" } } },
        post: { tags: ["Records"], summary: "Grant a provider standing access by email (patient)", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["granteeEmail"], properties: { granteeEmail: { type: "string" }, scope: { type: "array", items: { type: "string" } }, expiresAt: { type: "string", format: "date-time" } } } } } }, responses: { 201: { description: "Granted" } } },
      },
      "/records/{patientId}/grants/{grantId}": {
        delete: { tags: ["Records"], summary: "Revoke access (patient)", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }, { name: "grantId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Revoked" } } },
      },
      "/records/{patientId}/access-log": {
        get: { tags: ["Records"], summary: "Every read of this record — view, denied, or break_glass, with actor and reason", security: [bearerAuth], parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Access log" } } },
      },

      // ── Lab orders ─────────────────────────────────────────────────────────
      "/storefront/labs": {
        get: { tags: ["Labs"], summary: "Find nearby diagnostic labs (proximity-ranked)", parameters: [{ name: "lat", in: "query", schema: { type: "number" } }, { name: "lng", in: "query", schema: { type: "number" } }, { name: "county", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Labs" } } },
      },
      "/storefront/labs/{orgId}/tests": {
        get: { tags: ["Labs"], summary: "Get a lab's test menu", parameters: [{ name: "orgId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Test menu" } } },
      },
      "/lab-orders": {
        get: { tags: ["Labs"], summary: "List the authenticated patient's own lab orders", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Lab orders" } } },
        post: { tags: ["Labs"], summary: "Order tests from a lab + initiate payment (patient)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["orgId", "testIds", "phoneNumber"], properties: { orgId: { type: "string", format: "uuid" }, testIds: { type: "array", items: { type: "string", format: "uuid" } }, collectionType: { type: "string", enum: ["walk_in", "home_collection"] }, phoneNumber: { type: "string" } } } } } }, responses: { 201: { description: "Order created" } } },
      },
      "/vendor/lab-tests": {
        get: { tags: ["Labs"], summary: "List this lab's test menu", security: [bearerAuth], responses: { 200: { description: "Tests" } } },
        post: { tags: ["Labs"], summary: "Add a test to the menu", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "category", "priceKes"] } } } }, responses: { 201: { description: "Created" } } },
      },
      "/vendor/lab-orders": {
        get: { tags: ["Labs"], summary: "This lab's order queue", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Lab orders" } } },
      },
      "/vendor/lab-orders/{labOrderId}": {
        patch: { tags: ["Labs"], summary: "Accept, mark sample collected/processing, or cancel — accepting requires a completed payment", security: [bearerAuth], parameters: [{ name: "labOrderId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["accepted", "sample_collected", "processing", "cancelled"] } } } } } }, responses: { 200: { description: "Updated" }, 400: { description: "Not paid for yet, or invalid transition" } } },
      },
      "/vendor/lab-orders/items/{itemId}/result": {
        post: { tags: ["Labs"], summary: "Enter a result for one test item — order auto-advances to resulted once every item has a result", security: [bearerAuth], parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["value"], properties: { value: { type: "string" }, unit: { type: "string" }, referenceRange: { type: "string" }, flag: { type: "string", enum: ["normal", "high", "low", "critical"] }, documentFileUrl: { type: "string" } } } } } }, responses: { 201: { description: "Result recorded; a scan (if provided) also lands in the patient's record" } } },
      },

      // ── Jenga payments ─────────────────────────────────────────────────────
      "/payments/jenga/callback": {
        post: { tags: ["Payments"], summary: "Jenga M-Pesa STK confirmation callback (Jenga → CareBora). Unsigned — re-confirmed via Jenga's order-status query before settling.", responses: { 200: { description: "Always 200 so Jenga doesn't retry" } } },
      },
      "/payments/jenga/pgw/callback": {
        get: { tags: ["Payments"], summary: "Jenga PGW hosted-checkout browser redirect. Verifies a cryptographic hash before settling.", parameters: [{ name: "transactionId", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "orderReference", in: "query", schema: { type: "string" } }, { name: "hash", in: "query", schema: { type: "string" } }], responses: { 302: { description: "Redirects to a friendly result page" } } },
      },
      "/payments/till/submit": {
        post: { tags: ["Payments"], summary: "Interim Till mode — patient reports the M-Pesa confirmation code for admin verification", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["gatewayRef", "code"], properties: { gatewayRef: { type: "string" }, code: { type: "string" } } } } } }, responses: { 200: { description: "Submitted for verification" } } },
      },
      "/admin/payments/verifications": {
        get: { tags: ["Admin"], summary: "List Till payments awaiting verification", security: [bearerAuth], responses: { 200: { description: "Pending verifications" } } },
        post: { tags: ["Admin"], summary: "Approve or reject a Till payment", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["id", "approve"], properties: { id: { type: "string" }, approve: { type: "boolean" } } } } } }, responses: { 200: { description: "Verified" } } },
      },

      // ── Home Visits ────────────────────────────────────────────────────────
      "/home-visits": {
        get: { tags: ["Home Visits"], summary: "List home visits", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "specialty", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Home visits" } } },
        post: { tags: ["Home Visits"], summary: "Request home visit (patient)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["specialty", "description", "address", "county"], properties: { specialty: { type: "string", enum: ["nurse", "physio", "doctor"] }, urgency: { type: "string", enum: ["routine", "urgent"] }, description: { type: "string" }, address: { type: "string" }, county: { type: "string" } } } } } }, responses: { 201: { description: "Visit request created" } } },
      },
      "/home-visits/{visitId}": {
        get: { tags: ["Home Visits"], summary: "Get home visit", security: [bearerAuth], parameters: [{ name: "visitId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Home visit" } } },
        patch: { tags: ["Home Visits"], summary: "Update status or visit notes", security: [bearerAuth], parameters: [{ name: "visitId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["en_route", "arrived", "completed", "cancelled"] }, visitNotes: { type: "string" } } } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/home-visits/{visitId}/assign": {
        post: { tags: ["Home Visits"], summary: "Assign provider + set fee (admin)", security: [bearerAuth], parameters: [{ name: "visitId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["providerId", "feeKes", "scheduledAt"], properties: { providerId: { type: "string" }, feeKes: { type: "integer" }, scheduledAt: { type: "string", format: "date-time" } } } } } }, responses: { 200: { description: "Assigned" } } },
      },
      "/home-visits/{visitId}/pay": {
        post: { tags: ["Home Visits"], summary: "Initiate M-Pesa payment for visit (patient)", security: [bearerAuth], parameters: [{ name: "visitId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["phoneNumber"], properties: { phoneNumber: { type: "string" } } } } } }, responses: { 200: { description: "STK push initiated" } } },
      },

      // ── Admin ──────────────────────────────────────────────────────────────
      "/admin/users": {
        get: { tags: ["Admin"], summary: "List all users", security: [bearerAuth], parameters: [{ name: "role", in: "query", schema: { type: "string" } }, { name: "isActive", in: "query", schema: { type: "boolean" } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Users" } } },
      },
      "/admin/users/{userId}": {
        get: { tags: ["Admin"], summary: "Get user detail with profiles, documents, sessions", security: [bearerAuth], parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "User" } } },
        patch: { tags: ["Admin"], summary: "Activate/deactivate or change role", security: [bearerAuth], parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { isActive: { type: "boolean" }, role: { type: "string" } } } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/admin/verifications": {
        get: { tags: ["Admin"], summary: "List provider verification queue", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "specialty", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Providers" } } },
      },
      "/admin/verifications/{userId}/review": {
        post: { tags: ["Admin"], summary: "Approve/reject provider verification", security: [bearerAuth], parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["in_review", "verified", "rejected"] }, notes: { type: "string" } } } } } }, responses: { 200: { description: "Updated" } } },
      },
      "/admin/stats": {
        get: { tags: ["Admin"], summary: "Platform-wide aggregate stats", security: [bearerAuth], responses: { 200: { description: "Stats" } } },
      },
      "/admin/audit-logs": {
        get: { tags: ["Admin"], summary: "Query audit trail", security: [bearerAuth], parameters: [{ name: "actorId", in: "query", schema: { type: "string" } }, { name: "action", in: "query", schema: { type: "string" } }, { name: "entityType", in: "query", schema: { type: "string" } }, { name: "from", in: "query", schema: { type: "string", format: "date-time" } }, { name: "to", in: "query", schema: { type: "string", format: "date-time" } }], responses: { 200: { description: "Audit log entries" } } },
      },
    },
    tags: [
      { name: "System" },
      { name: "Auth" },
      { name: "Profiles" },
      { name: "Providers" },
      { name: "Availability" },
      { name: "Appointments" },
      { name: "Consultations" },
      { name: "Prescriptions" },
      { name: "Payments" },
      { name: "Pharmacy" },
      { name: "Vendor" },
      { name: "Organizations" },
      { name: "Ambulance" },
      { name: "Records" },
      { name: "Labs" },
      { name: "Home Visits" },
      { name: "Admin" },
    ],
  };

  const full = {
    ...spec,
    paths: mergePaths(spec.paths as unknown as Record<string, PathItem>, generated.paths as unknown as Record<string, PathItem>),
    components: {
      ...spec.components,
      schemas: {
        ...spec.components.schemas,
        // Every success response is wrapped as { data: … }; every failure as { error: … }.
        DataEnvelope: { type: "object", properties: { data: {} }, required: ["data"] },
        ErrorEnvelope: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", enum: ["VALIDATION_ERROR", "BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "RATE_LIMITED", "INTERNAL", "SERVICE_UNAVAILABLE"] },
                message: { type: "string" },
                details: { description: "For VALIDATION_ERROR: { fieldErrors: { field: [messages] } }." },
              },
            },
          },
        },
      },
      responses: {
        Error: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } } },
      },
    },
    tags: [...spec.tags, { name: "AI" }, { name: "Notifications" }, { name: "Support" }],
  };

  return NextResponse.json(full, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

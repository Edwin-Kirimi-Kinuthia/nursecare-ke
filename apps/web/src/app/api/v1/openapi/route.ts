import { NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const bearerAuth = { bearerAuth: [] };

/** GET /api/v1/openapi — machine-readable OpenAPI 3.1 spec for all CareBora endpoints. */
export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "CareBora API",
      version: "1.0.0",
      description:
        "API-first Kenyan telehealth platform. Covers auth, provider marketplace, " +
        "teleconsultation, M-Pesa payments, pharmacy, home-based care, and admin ops.",
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
            role: { type: "string", enum: ["patient", "doctor", "nurse", "physio", "pharmacy", "admin"] },
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

      // ── Pharmacy ───────────────────────────────────────────────────────────
      "/products": {
        get: { tags: ["Pharmacy"], summary: "Browse product catalogue", parameters: [{ name: "category", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "requiresPrescription", in: "query", schema: { type: "boolean" } }, { name: "inStock", in: "query", schema: { type: "boolean" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "offset", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "Products" } } },
      },
      "/products/{productId}": {
        get: { tags: ["Pharmacy"], summary: "Get product detail", parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Product" }, 404: { description: "Not found" } } },
      },
      "/orders": {
        get: { tags: ["Pharmacy"], summary: "List orders for current user", security: [bearerAuth], parameters: [{ name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Orders" } } },
        post: { tags: ["Pharmacy"], summary: "Place order + initiate M-Pesa payment (patient)", security: [bearerAuth], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["items", "phoneNumber", "deliveryAddress"], properties: { items: { type: "array", items: { type: "object", required: ["productId", "qty"], properties: { productId: { type: "string" }, qty: { type: "integer" } } } }, phoneNumber: { type: "string" }, deliveryAddress: { type: "string" }, deliveryNotes: { type: "string" }, prescriptionId: { type: "string" } } } } } }, responses: { 201: { description: "Order created; STK push sent" } } },
      },
      "/orders/{orderId}": {
        get: { tags: ["Pharmacy"], summary: "Get order detail", security: [bearerAuth], parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Order" } } },
        patch: { tags: ["Pharmacy"], summary: "Update order status", security: [bearerAuth], parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["processing", "dispatched", "delivered", "cancelled"] } } } } } }, responses: { 200: { description: "Updated" } } },
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
      { name: "Home Visits" },
      { name: "Admin" },
    ],
  };

  return NextResponse.json(spec, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

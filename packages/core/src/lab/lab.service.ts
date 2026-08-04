import { randomUUID } from "node:crypto";
import { db } from "@carebora/db";
import {
  ApiError,
  type CreateLabTestInput,
  type PatchLabTestInput,
  type LabTestsQuery,
  type CreateLabOrderInput,
  type PatchLabOrderInput,
  type LabOrdersQuery,
  type EnterLabResultInput,
} from "@carebora/shared";
import { paymentService, toPaymentSummary } from "../payment/payment.service";
import { putFile } from "../storage/storage";
import { assertCanRead } from "../records/access";
import type { UserRole } from "@carebora/shared";

const ORDER_INCLUDE = {
  patient: { select: { id: true, fullName: true, phone: true } },
  organization: { select: { id: true, name: true } },
  items: { include: { labTest: true, result: true } },
} as const;

async function attachPayment<T extends { id: string }>(order: T) {
  const payment = await paymentService.getForSubject("lab_order", order.id);
  return { ...order, payment };
}

export const labService = {
  // ── Storefront: nearby labs + their test menu ──────────────────────────────

  async nearbyLabs(query: { lat?: number; lng?: number; county?: string; limit: number }) {
    // Reuses the same distance-ranked pattern as orgService.findNearby / storefrontService.
    if (query.lat !== undefined && query.lng !== undefined) {
      return db.$queryRaw<Array<{ orgId: string; orgName: string; branchName: string; county: string; distanceKm: number }>>`
        SELECT o.id AS "orgId", o.name AS "orgName", b.name AS "branchName", b.county,
          round((ST_Distance(b.geog, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) / 1000)::numeric, 2)::float AS "distanceKm"
        FROM org_branches b
        JOIN organizations o ON o.id = b.org_id
        WHERE o.type = 'lab' AND o.status = 'approved' AND b.is_active = true
        ORDER BY "distanceKm" ASC
        LIMIT ${query.limit}
      `;
    }
    const where: Record<string, unknown> = { type: "lab", status: "approved" };
    if (query.county) where.branches = { some: { county: query.county, isActive: true } };
    const orgs = await db.organization.findMany({
      where, include: { branches: { take: 1 } }, orderBy: [{ ratingAvg: "desc" }], take: query.limit,
    });
    return orgs.map((o) => ({
      orgId: o.id, orgName: o.name, branchName: o.branches[0]?.name ?? "", county: o.branches[0]?.county ?? "", distanceKm: null as number | null,
    }));
  },

  async testsForOrg(orgId: string, query: LabTestsQuery) {
    const where: Record<string, unknown> = { orgId, isActive: true };
    if (query.category) where.category = { equals: query.category, mode: "insensitive" };
    if (query.search) where.name = { contains: query.search, mode: "insensitive" };
    return db.labTest.findMany({ where, orderBy: { name: "asc" } });
  },

  // ── Vendor: manage the test menu ────────────────────────────────────────────

  async listTestsForVendor(orgId: string) {
    return db.labTest.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  },
  async createTest(orgId: string, input: CreateLabTestInput) {
    return db.labTest.create({ data: { orgId, ...input } });
  },
  async patchTest(orgId: string, testId: string, input: PatchLabTestInput) {
    const test = await db.labTest.findFirst({ where: { id: testId, orgId } });
    if (!test) throw ApiError.notFound("Lab test not found");
    return db.labTest.update({ where: { id: testId }, data: input });
  },

  // ── Orders (patient self-checkout, may reference a consultation) ───────────

  async create(patientId: string, input: CreateLabOrderInput) {
    const tests = await db.labTest.findMany({ where: { id: { in: input.testIds }, orgId: input.orgId, isActive: true } });
    if (tests.length !== input.testIds.length) throw ApiError.badRequest("One or more tests are unavailable");
    const totalKes = tests.reduce((sum, t) => sum + t.priceKes, 0);

    // Generated up front (mirrors orderService.create) so the Payment's subjectId
    // can reference the LabOrder's real id from the moment it's created.
    const orderId = randomUUID();
    const patient = await db.user.findUniqueOrThrow({ where: { id: patientId } });
    const { payment, redirect } = await paymentService.initiate({
      subjectType: "lab_order",
      subjectId: orderId,
      patientId,
      orgId: input.orgId,
      patientName: patient.fullName,
      patientEmail: patient.email,
      amountKes: totalKes,
      phoneNumber: input.phoneNumber,
      description: "CareBora lab tests",
      refPrefix: "LAB",
    });
    void redirect; // lab_order checkout only supports STK/Till for now (no hosted-checkout UI yet)

    const order = await db.labOrder.create({
      data: {
        id: orderId, patientId, orderedById: patientId, orgId: input.orgId,
        consultationId: input.consultationId ?? null,
        collectionType: input.collectionType,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        address: input.address ?? null,
        phoneNumber: input.phoneNumber,
        totalKes,
        items: { create: tests.map((t) => ({ labTestId: t.id, testName: t.name, priceKes: t.priceKes })) },
      },
      include: ORDER_INCLUDE,
    });
    return { ...order, payment: toPaymentSummary(payment) };
  },

  async list(patientId: string, query: LabOrdersQuery) {
    const where = { patientId, ...(query.status ? { status: query.status } : {}) };
    const [orders, total] = await Promise.all([
      db.labOrder.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: "desc" }, skip: query.offset, take: query.limit }),
      db.labOrder.count({ where }),
    ]);
    return { orders: await Promise.all(orders.map(attachPayment)), total, limit: query.limit, offset: query.offset };
  },

  async getById(orderId: string, actor: { sub: string; role: UserRole }) {
    const order = await db.labOrder.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw ApiError.notFound("Lab order not found");
    if (order.patientId !== actor.sub) await assertCanRead(order.patientId, actor);
    return attachPayment(order);
  },

  // ── Vendor: fulfilment ───────────────────────────────────────────────────────
  // A lab order's status stays "requested" until the lab explicitly accepts it —
  // payment completion doesn't drive fulfilment (see the payment-completed guard
  // on patchOrder below), unlike orders/home-visits.

  async listForOrg(orgId: string, query: LabOrdersQuery) {
    const where = { orgId, ...(query.status ? { status: query.status } : {}) };
    const [orders, total] = await Promise.all([
      db.labOrder.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: "desc" }, skip: query.offset, take: query.limit }),
      db.labOrder.count({ where }),
    ]);
    return { orders: await Promise.all(orders.map(attachPayment)), total, limit: query.limit, offset: query.offset };
  },

  async patchOrder(orgId: string, orderId: string, input: PatchLabOrderInput) {
    const order = await db.labOrder.findFirst({ where: { id: orderId, orgId } });
    if (!order) throw ApiError.notFound("Lab order not found");
    const validNext: Record<string, string[]> = {
      requested: ["accepted", "cancelled"],
      accepted: ["sample_collected", "cancelled"],
      sample_collected: ["processing"],
      processing: ["resulted"],
    };
    if (input.status && !(validNext[order.status] ?? []).includes(input.status)) {
      throw ApiError.badRequest(`Cannot move a ${order.status} order to ${input.status}`);
    }
    if (input.status === "accepted") {
      const payment = await paymentService.getForSubject("lab_order", orderId);
      if (payment?.status !== "completed") {
        throw ApiError.badRequest("This order has not been paid for yet");
      }
    }
    return db.labOrder.update({ where: { id: orderId }, data: input, include: ORDER_INCLUDE });
  },

  /** Enters a result for one item; auto-advances the order to "resulted" once every item has one. */
  async enterResult(orgId: string, itemId: string, actorId: string, input: EnterLabResultInput) {
    const item = await db.labOrderItem.findFirst({
      where: { id: itemId, labOrder: { orgId } },
      include: { labOrder: true, result: true },
    });
    if (!item) throw ApiError.notFound("Lab order item not found");
    if (item.result) throw ApiError.conflict("This item already has a result");
    if (!["sample_collected", "processing"].includes(item.labOrder.status)) {
      throw ApiError.badRequest("Sample must be collected before entering a result");
    }

    let documentId: string | null = null;
    if (input.documentFileUrl) {
      const stored = await putFile("lab_result", input.documentFileUrl);
      const doc = await db.medicalDocument.create({
        data: { patientId: item.labOrder.patientId, uploadedById: actorId, type: "lab_result", title: item.testName, fileUrl: stored.url },
      });
      documentId = doc.id;
    }

    const result = await db.labResult.create({
      data: {
        labOrderItemId: item.id, value: input.value, unit: input.unit ?? null,
        referenceRange: input.referenceRange ?? null, flag: input.flag ?? null,
        verifiedById: actorId, documentId,
      },
    });

    const remaining = await db.labOrderItem.count({ where: { labOrderId: item.labOrderId, result: null } });
    if (remaining === 0) {
      await db.labOrder.update({ where: { id: item.labOrderId }, data: { status: "resulted" } });
    }
    return result;
  },
};

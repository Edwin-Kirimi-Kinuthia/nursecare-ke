import { db } from "@carebora/db";
import {
  ApiError,
  type CreateAmbulanceRequestInput,
  type AcceptAmbulanceRequestInput,
  type PatchAmbulanceRequestInput,
  type AmbulanceRequestsQuery,
  type VendorAmbulanceQueueQuery,
  type CreateAmbulanceInput,
  type PatchAmbulanceInput,
  type UserRole,
} from "@carebora/shared";
import { paymentService, toPaymentSummary } from "../payment/payment.service";

const REQUEST_INCLUDE = {
  patient: { select: { id: true, fullName: true, phone: true } },
  organization: { select: { id: true, name: true, contactPhone: true } },
  ambulance: true,
  events: { orderBy: { at: "asc" as const } },
} as const;

async function writeEvent(requestId: string, status: string, note: string | null, actorId: string | null) {
  await db.ambulanceRequestEvent.create({
    data: { requestId, status: status as never, note, actorId },
  });
}

function canView(req: { patientId: string; orgId: string | null }, userId: string, role: UserRole, orgId?: string) {
  if (role === "admin") return true;
  if (req.patientId === userId) return true;
  if (orgId && req.orgId === orgId) return true;
  return false;
}

async function attachPayment<T extends { id: string }>(req: T) {
  const payment = await paymentService.getForSubject("ambulance", req.id);
  return { ...req, payment };
}

export const ambulanceService = {
  async request(patientId: string, input: CreateAmbulanceRequestInput) {
    const request = await db.ambulanceRequest.create({
      data: {
        patientId,
        requestedById: patientId,
        type: input.type,
        urgency: input.urgency,
        pickupAddress: input.pickupAddress,
        pickupCounty: input.pickupCounty,
        pickupLatitude: input.pickupLatitude,
        pickupLongitude: input.pickupLongitude,
        destinationName: input.destinationName ?? null,
        destinationAddress: input.destinationAddress ?? null,
        patientCondition: input.patientCondition,
        contactPhone: input.contactPhone,
      },
      include: REQUEST_INCLUDE,
    });
    await writeEvent(request.id, "requested", null, patientId);
    return attachPayment(request);
  },

  async list(patientId: string, query: AmbulanceRequestsQuery) {
    const where = { patientId, ...(query.status ? { status: query.status } : {}) };
    const [requests, total] = await Promise.all([
      db.ambulanceRequest.findMany({
        where, include: REQUEST_INCLUDE, orderBy: { createdAt: "desc" }, skip: query.offset, take: query.limit,
      }),
      db.ambulanceRequest.count({ where }),
    ]);
    return {
      requests: await Promise.all(requests.map(attachPayment)),
      total, limit: query.limit, offset: query.offset,
    };
  },

  async getById(requestId: string, userId: string, role: UserRole, orgId?: string) {
    const request = await db.ambulanceRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE });
    if (!request) throw ApiError.notFound("Ambulance request not found");
    if (!canView(request, userId, role, orgId)) throw ApiError.forbidden();
    return attachPayment(request);
  },

  /**
   * The dispatch queue for an ambulance-operator org: unassigned requests
   * within range of any of the org's branches, ranked by distance, plus the
   * org's own in-progress requests. Reuses the same PostGIS distance pattern
   * as orgService.findNearby / storefrontService, just inverted (branches → requests).
   */
  async vendorQueue(orgId: string, query: VendorAmbulanceQueueQuery) {
    const own = await db.ambulanceRequest.findMany({
      where: { orgId, status: { notIn: ["completed", "cancelled"] } },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    let unassigned: (typeof own)[number][] = [];
    if (query.lat !== undefined && query.lng !== undefined) {
      const rows = await db.$queryRaw<Array<{ id: string }>>`
        SELECT r.id FROM ambulance_requests r
        WHERE r.status = 'requested'
          AND ST_DWithin(r.pickup_geog, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography, 30000)
        ORDER BY ST_Distance(r.pickup_geog, ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography) ASC
        LIMIT ${query.limit}
      `;
      const ids = rows.map((r) => r.id);
      const found = await db.ambulanceRequest.findMany({ where: { id: { in: ids } }, include: REQUEST_INCLUDE });
      const byId = new Map(found.map((r) => [r.id, r]));
      unassigned = ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
    } else {
      unassigned = await db.ambulanceRequest.findMany({
        where: { status: "requested" }, include: REQUEST_INCLUDE, orderBy: { createdAt: "asc" }, take: query.limit,
      });
    }

    return {
      own: await Promise.all(own.map(attachPayment)),
      unassigned: await Promise.all(unassigned.map(attachPayment)),
    };
  },

  /** An org accepts an unassigned request — first to accept wins (atomic status guard). */
  async accept(requestId: string, orgId: string, actorId: string, input: AcceptAmbulanceRequestInput) {
    if (input.ambulanceId) {
      const ambulance = await db.ambulance.findFirst({ where: { id: input.ambulanceId, orgId, isActive: true } });
      if (!ambulance) throw ApiError.badRequest("Ambulance not found in your fleet");
    }
    const { count } = await db.ambulanceRequest.updateMany({
      where: { id: requestId, status: "requested" },
      data: {
        orgId, ambulanceId: input.ambulanceId ?? null, estimatedKes: input.estimatedKes ?? null,
        status: "accepted", acceptedAt: new Date(),
      },
    });
    if (count === 0) throw ApiError.conflict("This request has already been accepted by another operator");
    await writeEvent(requestId, "accepted", null, actorId);
    return db.ambulanceRequest.findUnique({ where: { id: requestId }, include: REQUEST_INCLUDE }).then((r) => attachPayment(r!));
  },

  /** Org advances the dispatch status, or sets the final fee on completion. */
  async patch(requestId: string, orgId: string, actorId: string, input: PatchAmbulanceRequestInput) {
    const request = await db.ambulanceRequest.findFirst({ where: { id: requestId, orgId } });
    if (!request) throw ApiError.notFound("Ambulance request not found");

    const validNext: Record<string, string[]> = {
      accepted: ["dispatched"],
      dispatched: ["en_route_pickup"],
      en_route_pickup: ["arrived_pickup"],
      arrived_pickup: ["en_route_destination"],
      en_route_destination: ["completed"],
    };

    const data: Record<string, unknown> = {};
    if (input.status) {
      if (!(validNext[request.status] ?? []).includes(input.status)) {
        throw ApiError.badRequest(`Cannot move a ${request.status} request to ${input.status}`);
      }
      data.status = input.status;
      if (input.status === "dispatched") data.dispatchedAt = new Date();
      if (input.status === "arrived_pickup") data.arrivedPickupAt = new Date();
      if (input.status === "completed") data.completedAt = new Date();
    }
    if (input.feeKes !== undefined) data.feeKes = input.feeKes;

    const updated = await db.ambulanceRequest.update({ where: { id: requestId }, data, include: REQUEST_INCLUDE });
    if (input.status) await writeEvent(requestId, input.status, input.note ?? null, actorId);
    return attachPayment(updated);
  },

  /** Patient cancels — only before the crew has dispatched. */
  async cancel(requestId: string, userId: string, role: UserRole, reason?: string) {
    const request = await db.ambulanceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw ApiError.notFound("Ambulance request not found");
    const isAdmin = role === "admin";
    const isPatient = request.patientId === userId;
    if (!isAdmin && !isPatient) throw ApiError.forbidden();
    if (!["requested", "accepted"].includes(request.status)) {
      throw ApiError.badRequest("Cannot cancel a request that has already been dispatched");
    }
    const updated = await db.ambulanceRequest.update({
      where: { id: requestId },
      data: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason ?? null },
      include: REQUEST_INCLUDE,
    });
    await writeEvent(requestId, "cancelled", reason ?? null, userId);
    return attachPayment(updated);
  },

  /** Patient pays after the trip completes (billed like a taxi, not prepaid — matches emergency-dispatch reality). */
  async initiatePayment(requestId: string, patientId: string, phoneNumber: string) {
    const request = await db.ambulanceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw ApiError.notFound("Ambulance request not found");
    if (request.patientId !== patientId) throw ApiError.forbidden();
    if (request.status !== "completed") throw ApiError.badRequest("Request must be completed before payment");
    if (!request.feeKes) throw ApiError.badRequest("Fee has not been set for this request");

    const patient = await db.user.findUniqueOrThrow({ where: { id: patientId } });
    const { payment } = await paymentService.initiate({
      subjectType: "ambulance",
      subjectId: request.id,
      patientId,
      orgId: request.orgId,
      patientName: patient.fullName,
      patientEmail: patient.email,
      amountKes: request.feeKes,
      phoneNumber,
      description: "CareBora ambulance service",
      refPrefix: "AMB",
    });
    return toPaymentSummary(payment);
  },

  // ── Fleet management ───────────────────────────────────────────────────────

  async listFleet(orgId: string) {
    return db.ambulance.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  },

  async createAmbulance(orgId: string, input: CreateAmbulanceInput) {
    return db.ambulance.create({ data: { orgId, ...input } });
  },

  async patchAmbulance(orgId: string, ambulanceId: string, input: PatchAmbulanceInput) {
    const ambulance = await db.ambulance.findFirst({ where: { id: ambulanceId, orgId } });
    if (!ambulance) throw ApiError.notFound("Ambulance not found");
    return db.ambulance.update({ where: { id: ambulanceId }, data: input });
  },
};

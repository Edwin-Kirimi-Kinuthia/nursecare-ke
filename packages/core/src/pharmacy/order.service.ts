import { inAppNotifications } from "../notifications/inapp.service";
import { randomUUID } from "node:crypto";
import { HOUSE_ORG_SLUG } from "./house-pharmacy";
import { db } from "@carebora/db";
import {
  ApiError,
  ORDER_NEXT_STATUS,
  type CreateOrderInput,
  type OrdersQuery,
  type VendorOrdersQuery,
  type PatchVendorOrderInput,
  type UserRole,
} from "@carebora/shared";
import { paymentService, toPaymentSummary } from "../payment/payment.service";
import { getEnv } from "../config/env";

const VENDOR_ORDER_INCLUDE = {
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  organization: { select: { id: true, name: true, type: true } },
  items: { include: { listing: { include: { drug: true } } } },
} as const;

const ORDER_INCLUDE = {
  patient: { select: { id: true, fullName: true, phone: true } },
  prescription: { select: { id: true, issuedAt: true } },
  vendorOrders: { include: VENDOR_ORDER_INCLUDE },
} as const;

async function attachPayment<T extends { id: string }>(order: T) {
  const payment = await paymentService.getForSubject("order", order.id);
  return { ...order, payment };
}

/**
 * Runs `work`, cancelling the already-created Payment if it throws.
 *
 * Checkout has to call the gateway before the order row exists (the gateway
 * reference is needed to create it), so a later failure would otherwise leave a
 * pending charge with no order behind it.
 */
async function runOrRollBackPayment<T>(paymentId: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    // Best-effort: never let cleanup mask the original failure.
    await db.payment
      .updateMany({ where: { id: paymentId, status: "pending" }, data: { status: "cancelled" } })
      .catch(() => undefined);
    throw err;
  }
}

async function attachPayments<T extends { id: string }>(orders: T[]) {
  const payments = await paymentService.getForSubjects("order", orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, payment: payments.get(o.id) ?? null }));
}

export const orderService = {
  /** Checkout — a cart may span multiple vendor pharmacies; fans out into one VendorOrder per org. */
  async create(patientId: string, input: CreateOrderInput) {
    // 1. Fetch and validate listings. A listing is only purchasable while its
    //    org is approved — a suspended/rejected vendor must not be checkout-
    //    able just because a patient still has one of its listingIds cached
    //    (from a cart built before suspension, or a stale page).
    // Merge duplicate lines before checking limits, stock and minimum quantities.
    const quantities = new Map<string, number>();
    for (const item of input.items) quantities.set(item.listingId, (quantities.get(item.listingId) ?? 0) + item.qty);
    input = { ...input, items: [...quantities].map(([listingId, qty]) => ({ listingId, qty })) };
    if (input.items.some(item => item.qty > 100)) throw ApiError.badRequest("Order at most 100 units of each product");
    const listingIds = [...new Set(input.items.map((i) => i.listingId))];
    const listings = await db.listing.findMany({
      where: { id: { in: listingIds }, isActive: true, drug: { isActive: true }, organization: { status: "approved" } },
      include: { drug: true },
    });
    if (listings.length !== listingIds.length) {
      throw ApiError.badRequest("One or more items are unavailable");
    }

    // 2. Prescription requirement — for Rx items the patient must EITHER attach an
    //    existing prescription OR upload a prescription image.
    const needsRx = listings.some((l) => l.drug.requiresPrescription);
    if (needsRx && !input.prescriptionId && !input.prescriptionImage) {
      throw ApiError.badRequest(
        "These items need a prescription. Upload one or book a consultation to get a prescription.",
      );
    }
    if (input.prescriptionId) {
      const rx = await db.prescription.findUnique({ where: { id: input.prescriptionId } });
      if (!rx || rx.patientId !== patientId) throw ApiError.badRequest("Invalid prescription");
    }

    // 3. Build line items grouped by vendor org, checking stock per listing.
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const byOrg = new Map<string, { orgId: string; items: { listingId: string; drugName: string; unitPriceKes: number; qty: number }[]; subtotalKes: number }>();

    for (const item of input.items) {
      const listing = listingMap.get(item.listingId)!;
      if (item.qty < listing.minOrderQty) throw ApiError.badRequest(`Minimum order for "${listing.drug.name}" is ${listing.minOrderQty} units`);
      if (listing.stockQty < item.qty) {
        throw ApiError.conflict(`Insufficient stock for "${listing.drug.name}"`);
      }
      const group = byOrg.get(listing.orgId) ?? { orgId: listing.orgId, items: [], subtotalKes: 0 };
      group.items.push({
        listingId: listing.id,
        drugName: listing.drug.name,
        unitPriceKes: listing.priceKes,
        qty: item.qty,
      });
      group.subtotalKes += listing.priceKes * item.qty;
      byOrg.set(listing.orgId, group);
    }
    const totalKes = [...byOrg.values()].reduce((sum, g) => sum + g.subtotalKes, 0);

    const patient = await db.user.findUniqueOrThrow({ where: { id: patientId } });

    // 4. Initiate payment BEFORE creating any rows (mirrors the single-vendor
    //    behaviour: a gateway failure means nothing gets created). The order id
    //    is generated up front so the Payment's subjectId can reference it.
    const orderId = randomUUID();
    const { payment, redirect } = await paymentService.initiate({
      subjectType: "order",
      subjectId: orderId,
      patientId,
      patientName: patient.fullName,
      patientEmail: patient.email,
      amountKes: totalKes,
      phoneNumber: input.phoneNumber,
      description: "CareBora pharmacy order",
      refPrefix: "ORD",
    });

    // 5. Create order + one VendorOrder per org + decrement stock, in one transaction.
    //    The Payment already exists at this point, so if the transaction rolls
    //    back — most plausibly because someone else took the last of the stock
    //    between the check above and the reservation below — that payment would
    //    otherwise sit `pending` forever, cluttering the Till verification queue
    //    and the reconciliation sweep with a charge for an order that was never
    //    created. Cancel it before rethrowing.
    const order = await runOrRollBackPayment(payment.id, () => db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: orderId,
          patientId,
          prescriptionId: input.prescriptionId ?? null,
          prescriptionImageUrl: input.prescriptionImage ?? null,
          totalKes,
          phoneNumber: input.phoneNumber,
          deliveryAddress: input.deliveryAddress,
          deliveryNotes: input.deliveryNotes ?? null,
          vendorOrders: {
            create: [...byOrg.values()].map((g) => ({
              orgId: g.orgId,
              statusHistory: { create: { status: "pending" } },
              subtotalKes: g.subtotalKes,
              items: { create: g.items },
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
      // Reserve stock conditionally. The `stockQty < qty` check above happens
      // before the transaction, so on its own it's check-then-act: concurrent
      // carts all read the same stock, all pass, and all decrement — overselling
      // the vendor into negative stock and committing them to orders they can't
      // fill after the customer has already paid. Guarding the decrement on the
      // quantity still being available makes the database arbitrate, and a
      // no-op update means someone else took the last units first.
      for (const item of input.items) {
        const reserved = await tx.listing.updateMany({
          where: { id: item.listingId, isActive: true, drug: { isActive: true }, organization: { status: "approved" }, minOrderQty: { lte: item.qty }, stockQty: { gte: item.qty } },
          data: { stockQty: { decrement: item.qty } },
        });
        if (reserved.count === 0) {
          const name = listingMap.get(item.listingId)?.drug.name ?? "an item";
          throw ApiError.conflict(`"${name}" availability or minimum quantity changed — please refresh your cart`);
        }
      }
      return created;
    }));

    void inAppNotifications.serviceRequested("a pharmacy order", order.id);
    for (const orgId of byOrg.keys()) void inAppNotifications.pharmacyOrderRequested(orgId, order.id);
    return { ...order, payment: toPaymentSummary(payment), redirect };
  },

  /**
   * Called by the settlement dispatcher once the order's Payment is `completed`.
   * Marks every still-pending VendorOrder as paid and writes its own
   * platform-fee/vendor-payout ledger split — a cart can span several vendors,
   * so each one is split independently against its own subtotal and commission rate.
   */
  async onPaymentSettled(orderId: string, paymentId: string) {
    const vendorOrders = await db.vendorOrder.findMany({ where: { orderId, status: "pending" } });
    if (!vendorOrders.length) return;

    const defaultCommission = Number(getEnv().PLATFORM_FEE_PERCENT);
    for (const vo of vendorOrders) {
      const org = await db.organization.findUnique({ where: { id: vo.orgId }, select: { commissionPercent: true, slug: true } });
      // Care Bora's own pharmacy: the platform *is* the seller, so the whole
      // sale is its revenue. Run through the normal split it would book 10% as
      // commission and 90% as a payout owed to "Care Bora Pharmacy" — money the
      // company would owe itself, and revenue understated by nine tenths.
      const isHouse = org?.slug === HOUSE_ORG_SLUG;
      const commissionPercent = isHouse ? 100 : (org?.commissionPercent ?? defaultCommission);
      const platformFee = Math.round((vo.subtotalKes * commissionPercent) / 100);
      const vendorNet = vo.subtotalKes - platformFee;

      await db.$transaction([
        db.vendorOrder.update({ where: { id: vo.id }, data: { status: "paid", statusHistory: { create: { status: "paid" } } } }),
        db.ledgerEntry.create({
          data: {
            paymentId,
            type: "platform_fee",
            orgId: vo.orgId,
            amountKes: platformFee,
            description: isHouse
              ? `Care Bora Pharmacy sale, kept in full (vendor order ${vo.id.slice(0, 8)})`
              : `${commissionPercent}% platform commission (vendor order ${vo.id.slice(0, 8)})`,
          },
        }),
        ...(vendorNet > 0
          ? [
              db.ledgerEntry.create({
                data: {
                  paymentId,
                  type: "vendor_payout",
                  orgId: vo.orgId,
                  amountKes: vendorNet,
                  description: `Vendor net payout (vendor order ${vo.id.slice(0, 8)})`,
                },
              }),
            ]
          : []),
      ]);
    }
  },

  /** Called by the settlement dispatcher when the order's Payment fails — restores stock for every vendor order. */
  async onPaymentFailed(orderId: string) {
    const vendorOrders = await db.vendorOrder.findMany({
      where: { orderId, status: "pending" },
      include: { items: true },
    });
    if (!vendorOrders.length) return;
    await db.$transaction(async (tx) => {
      for (const vo of vendorOrders) {
        await tx.vendorOrder.update({ where: { id: vo.id }, data: { status: "cancelled", statusHistory: { create: { status: "cancelled" } } } });
        for (const item of vo.items) {
          await tx.listing.update({ where: { id: item.listingId }, data: { stockQty: { increment: item.qty } } });
        }
      }
    });
  },

  async list(userId: string, query: OrdersQuery) {
    const where = { patientId: userId };
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.order.count({ where }),
    ]);
    return { orders: await attachPayments(orders), total, limit: query.limit, offset: query.offset };
  },

  /** Platform-wide order oversight (every patient's checkouts, any vendor). */
  async adminList(query: OrdersQuery) {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        include: ORDER_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.order.count(),
    ]);
    return { orders: await attachPayments(orders), total, limit: query.limit, offset: query.offset };
  },

  async getById(orderId: string, userId: string, role: UserRole) {
    const order = await db.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw ApiError.notFound("Order not found");
    if (role !== "admin" && order.patientId !== userId) throw ApiError.forbidden();
    return attachPayment(order);
  },

  // ── Vendor-side fulfilment (one org's slice of an order) ──────────────────

  async listForOrg(orgId: string, query: VendorOrdersQuery) {
    const where = { orgId, ...(query.status ? { status: query.status } : {}) };
    const [vendorOrders, total] = await Promise.all([
      db.vendorOrder.findMany({
        where,
        include: {
          ...VENDOR_ORDER_INCLUDE,
          order: { select: { id: true, deliveryAddress: true, deliveryNotes: true, phoneNumber: true, patient: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.vendorOrder.count({ where }),
    ]);
    const payments = await paymentService.getForSubjects("order", vendorOrders.map((vo) => vo.orderId));
    return { vendorOrders: vendorOrders.map((vo) => {
      const payment = payments.get(vo.orderId);
      return { ...vo, order: { ...vo.order, payment: payment ? { status: payment.status, paidAt: payment.paidAt } : null } };
    }), total, limit: query.limit, offset: query.offset };
  },

  async adminPatchVendorOrder(vendorOrderId: string, input: PatchVendorOrderInput, actorId: string) {
    const order = await db.vendorOrder.findUnique({ where: { id: vendorOrderId }, select: { orgId: true } });
    if (!order) throw ApiError.notFound("Order not found");
    return this.patchVendorOrder(order.orgId, vendorOrderId, input, actorId);
  },

  async patchVendorOrder(orgId: string, vendorOrderId: string, input: PatchVendorOrderInput, actorId?: string) {
    const result = await db.$transaction(async tx => {
      const vo = await tx.vendorOrder.findFirst({ where: { id: vendorOrderId, orgId }, include: { items: true } });
      if (!vo) throw ApiError.notFound("Order not found");
      if (vo.status === input.status) return tx.vendorOrder.findUniqueOrThrow({ where: { id: vo.id }, include: VENDOR_ORDER_INCLUDE });
      const cancelling = input.status === "cancelled";
      if (cancelling ? !["paid", "processing"].includes(vo.status) : (ORDER_NEXT_STATUS[vo.status] !== input.status && !(input.status === "delivered" && ["paid", "processing", "dispatched", "in_delivery"].includes(vo.status)))) {
        throw ApiError.badRequest(`Cannot move a ${vo.status} order to ${input.status}`);
      }
      const now = new Date();
      const changed = await tx.vendorOrder.updateMany({
        where: { id: vo.id, orgId, status: vo.status },
        data: { status: input.status,
          ...(input.status === "dispatched" ? { dispatchedAt: now } : {}),
          ...(input.status === "in_delivery" ? { inDeliveryAt: now } : {}),
          ...(input.status === "delivered" ? { deliveredAt: now } : {}),
        },
      });
      if (!changed.count) throw ApiError.conflict("This order changed. Refresh before updating it again.");
      await tx.vendorOrderStatusEvent.create({ data: { vendorOrderId: vo.id, status: input.status, createdAt: now } });
      if (cancelling) {
        for (const item of vo.items) await tx.listing.update({ where: { id: item.listingId }, data: { stockQty: { increment: item.qty } } });
      }
      if (actorId) await tx.auditLog.create({ data: { actorId, action: "pharmacy.order_status", entityType: "VendorOrder", entityId: vo.id, metadata: { from: vo.status, to: input.status } } });
      return tx.vendorOrder.findUniqueOrThrow({ where: { id: vo.id }, include: VENDOR_ORDER_INCLUDE });
    });
    if (input.status === "delivered") await this.requestReview(orgId, vendorOrderId);
    return result;
  },

  async requestReview(orgId: string, vendorOrderId: string) {
    const vo = await db.vendorOrder.findFirst({ where: { id: vendorOrderId, orgId }, include: { order: { select: { patientId: true } }, organization: { select: { name: true } } } });
    if (!vo) throw ApiError.notFound("Order not found");
    if (vo.status !== "delivered") throw ApiError.badRequest("Mark this order delivered before requesting a review");
    await inAppNotifications.create(vo.order.patientId, {
      type: "service_review_requested", title: "How was your pharmacy delivery?",
      body: `Your order from ${vo.organization.name} was delivered. Please rate your experience.`,
      link: `/orders/${vo.orderId}`, eventKey: `pharmacy-review:${vo.id}`,
    });
    return { ok: true };
  },
  async adminRequestReview(vendorOrderId: string) {
    const vo = await db.vendorOrder.findUnique({ where: { id: vendorOrderId }, select: { orgId: true } });
    if (!vo) throw ApiError.notFound("Order not found");
    return this.requestReview(vo.orgId, vendorOrderId);
  },
};

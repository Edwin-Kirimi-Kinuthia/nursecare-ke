import { randomUUID } from "node:crypto";
import { HOUSE_ORG_SLUG } from "./house-pharmacy";
import { db } from "@carebora/db";
import {
  ApiError,
  type CreateOrderInput,
  type OrdersQuery,
  type VendorOrdersQuery,
  type PatchVendorOrderInput,
  type UserRole,
} from "@carebora/shared";
import { paymentService, toPaymentSummary } from "../payment/payment.service";
import { getEnv } from "../config/env";

const VENDOR_ORDER_INCLUDE = {
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
    const listingIds = [...new Set(input.items.map((i) => i.listingId))];
    const listings = await db.listing.findMany({
      where: { id: { in: listingIds }, isActive: true, organization: { status: "approved" } },
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
          where: { id: item.listingId, stockQty: { gte: item.qty } },
          data: { stockQty: { decrement: item.qty } },
        });
        if (reserved.count === 0) {
          const name = listingMap.get(item.listingId)?.drug.name ?? "an item";
          throw ApiError.conflict(`"${name}" just went out of stock — please adjust your cart`);
        }
      }
      return created;
    }));

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
        db.vendorOrder.update({ where: { id: vo.id }, data: { status: "paid" } }),
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
        await tx.vendorOrder.update({ where: { id: vo.id }, data: { status: "cancelled" } });
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
          order: { select: { id: true, deliveryAddress: true, phoneNumber: true, patient: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.offset,
        take: query.limit,
      }),
      db.vendorOrder.count({ where }),
    ]);
    return { vendorOrders, total, limit: query.limit, offset: query.offset };
  },

  async patchVendorOrder(orgId: string, vendorOrderId: string, input: PatchVendorOrderInput) {
    const vo = await db.vendorOrder.findFirst({ where: { id: vendorOrderId, orgId }, include: { items: true } });
    if (!vo) throw ApiError.notFound("Order not found");

    if (input.status === "cancelled") {
      if (vo.status !== "paid" && vo.status !== "processing") {
        throw ApiError.badRequest("Only paid or processing orders can be cancelled");
      }
      return db.$transaction(async (tx) => {
        const updated = await tx.vendorOrder.update({
          where: { id: vendorOrderId },
          data: { status: "cancelled" },
          include: VENDOR_ORDER_INCLUDE,
        });
        for (const item of vo.items) {
          await tx.listing.update({ where: { id: item.listingId }, data: { stockQty: { increment: item.qty } } });
        }
        return updated;
      });
    }

    const validNext: Record<string, string[]> = {
      paid: ["processing"],
      processing: ["dispatched"],
      dispatched: ["delivered"],
    };
    if (input.status && !(validNext[vo.status] ?? []).includes(input.status)) {
      throw ApiError.badRequest(`Cannot move a ${vo.status} order to ${input.status}`);
    }

    const data: Record<string, unknown> = {};
    if (input.status) {
      data.status = input.status;
      if (input.status === "dispatched") data.dispatchedAt = new Date();
      if (input.status === "delivered") data.deliveredAt = new Date();
    }
    return db.vendorOrder.update({ where: { id: vendorOrderId }, data, include: VENDOR_ORDER_INCLUDE });
  },
};

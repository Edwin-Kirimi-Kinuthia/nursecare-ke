import { db } from "@carebora/db";
import {
  ApiError,
  type CreateOrderInput,
  type MpesaCallback,
  type OrdersQuery,
  type PatchOrderInput,
  type UserRole,
} from "@carebora/shared";
import { normaliseMpesaPhone, stkPush } from "../payment/daraja";

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, imageUrl: true, category: true } },
    },
  },
  patient: { select: { id: true, fullName: true, phone: true } },
  prescription: { select: { id: true, issuedAt: true } },
} as const;

function isPharmacyOrAdmin(role: UserRole) {
  return role === "pharmacy" || role === "admin";
}

export const orderService = {
  async create(patientId: string, input: CreateOrderInput) {
    // 1. Fetch and validate products
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw ApiError.badRequest("One or more products are unavailable");
    }

    // 2. Prescription requirement check
    const needsRx = products.some((p) => p.requiresPrescription);
    if (needsRx && !input.prescriptionId) {
      throw ApiError.badRequest("A prescription is required for one or more items in this order");
    }
    if (input.prescriptionId) {
      const rx = await db.prescription.findUnique({ where: { id: input.prescriptionId } });
      if (!rx || rx.patientId !== patientId) throw ApiError.badRequest("Invalid prescription");
    }

    // 3. Build line items + check stock
    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalKes = 0;
    const lineItems: { productId: string; productName: string; unitPriceKes: number; qty: number }[] = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      if (product.stockQty < item.qty) {
        throw ApiError.conflict(`Insufficient stock for "${product.name}"`);
      }
      lineItems.push({
        productId: product.id,
        productName: product.name,
        unitPriceKes: product.priceKes,
        qty: item.qty,
      });
      totalKes += product.priceKes * item.qty;
    }

    // 4. Initiate STK push
    const phone = normaliseMpesaPhone(input.phoneNumber);
    const push = await stkPush({
      amount: totalKes,
      phone,
      accountRef: `PHARM`,
      description: "CareBora pharmacy order",
    });

    // 5. Create order + decrement stock in one transaction
    return db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          patientId,
          prescriptionId: input.prescriptionId ?? null,
          totalKes,
          phoneNumber: phone,
          deliveryAddress: input.deliveryAddress,
          deliveryNotes: input.deliveryNotes ?? null,
          checkoutRequestId: push.checkoutRequestId,
          merchantRequestId: push.merchantRequestId,
          items: { create: lineItems },
        },
        include: ORDER_INCLUDE,
      });
      for (const item of input.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.qty } },
        });
      }
      return order;
    });
  },

  /**
   * Handle a Daraja callback that belongs to an Order (not an Appointment payment).
   * Called from the unified /payments/mpesa/callback webhook after Payment lookup misses.
   */
  async handleCallback(payload: MpesaCallback) {
    const cb = payload.Body.stkCallback;
    const order = await db.order.findUnique({
      where: { checkoutRequestId: cb.CheckoutRequestID },
      include: { items: true },
    });
    if (!order) return false; // not an order payment

    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item ?? [];
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value as string | undefined;
      await db.order.update({
        where: { id: order.id },
        data: { status: "paid", mpesaReceiptNumber: receipt ?? null, paidAt: new Date() },
      });
    } else {
      // Restore stock on payment failure
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "cancelled", failureReason: cb.ResultDesc },
        });
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
        }
      });
    }
    return true;
  },

  async list(userId: string, role: UserRole, query: OrdersQuery) {
    const where = {
      ...(isPharmacyOrAdmin(role) ? {} : { patientId: userId }),
      ...(query.status ? { status: query.status } : {}),
    };
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
    return { orders, total, limit: query.limit, offset: query.offset };
  },

  async getById(orderId: string, userId: string, role: UserRole) {
    const order = await db.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw ApiError.notFound("Order not found");
    if (!isPharmacyOrAdmin(role) && order.patientId !== userId) throw ApiError.forbidden();
    return order;
  },

  async patch(orderId: string, userId: string, role: UserRole, input: PatchOrderInput) {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw ApiError.notFound("Order not found");

    const canManage = isPharmacyOrAdmin(role);
    const isOwner = order.patientId === userId;
    if (!canManage && !isOwner) throw ApiError.forbidden();

    if (input.status) {
      const pharmacyStatuses = ["processing", "dispatched", "delivered"] as const;
      if (!canManage && input.status !== "cancelled") {
        throw ApiError.forbidden("Patients can only cancel orders");
      }
      if (canManage && !(pharmacyStatuses as readonly string[]).includes(input.status)) {
        throw ApiError.forbidden("Pharmacy can only set processing, dispatched, or delivered");
      }
      if (!canManage && order.status !== "pending") {
        throw ApiError.badRequest("Only pending orders can be cancelled");
      }
    }

    if (input.status === "cancelled") {
      return db.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { status: "cancelled" },
          include: ORDER_INCLUDE,
        });
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.qty } },
          });
        }
        return updated;
      });
    }

    const data: Record<string, unknown> = {};
    if (input.status) {
      data.status = input.status;
      if (input.status === "dispatched") data.dispatchedAt = new Date();
      if (input.status === "delivered") data.deliveredAt = new Date();
    }

    return db.order.update({ where: { id: orderId }, data, include: ORDER_INCLUDE });
  },
};

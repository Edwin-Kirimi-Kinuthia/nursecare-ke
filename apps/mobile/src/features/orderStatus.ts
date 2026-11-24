import type { OrderStatus } from "@carebora/api-client";

export { orderStatusLabel as orderLabel } from "@carebora/shared";
export const orderTone = (s: OrderStatus) =>
  s === "delivered" || s === "paid" ? "ok" : s === "cancelled" || s === "refunded" ? "danger" : s === "pending" || s === "awaiting_verification" ? "warn" : "info";

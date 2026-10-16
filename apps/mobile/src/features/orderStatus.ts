import type { OrderStatus } from "@carebora/api-client";

const LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting payment", awaiting_verification: "Verifying payment", paid: "Paid", processing: "Preparing",
  dispatched: "On the way", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
};
export const orderLabel = (s: OrderStatus) => LABEL[s] ?? s;
export const orderTone = (s: OrderStatus) =>
  s === "delivered" || s === "paid" ? "ok" : s === "cancelled" || s === "refunded" ? "danger" : s === "pending" || s === "awaiting_verification" ? "warn" : "info";

import type { HomeVisitStatus } from "@carebora/api-client";

export const VISIT_LABEL: Record<HomeVisitStatus, string> = {
  pending: "Pending", awaiting_verification: "Verifying payment", assigned: "Assigned", paid: "Paid",
  en_route: "En route", arrived: "Arrived", completed: "Completed", cancelled: "Cancelled",
};
export const visitTone = (s: HomeVisitStatus) =>
  s === "completed" || s === "arrived" ? "ok" : s === "cancelled" ? "neutral" : s === "pending" || s === "awaiting_verification" ? "warn" : "info";

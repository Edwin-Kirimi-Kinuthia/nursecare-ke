/** Prices and stock count individual sellable units, never a prescribed dose. */
export function medicineUnit(form?: string | null): string {
  const value = (form ?? "").toLowerCase();
  if (/tablet|tab\b/.test(value)) return "tablet";
  if (/capsule|cap\b/.test(value)) return "capsule";
  if (/ampoule/.test(value)) return "ampoule";
  if (/injection|vial/.test(value)) return "vial";
  if (/suspension|syrup|solution|drops|liquid/.test(value)) return "bottle";
  if (/gel|cream|ointment|topical/.test(value)) return "tube";
  if (/inhaler/.test(value)) return "inhaler";
  if (/sachet/.test(value)) return "sachet";
  return "unit";
}
export const ORDER_LABELS: Record<string, string> = {
  pending: "Awaiting payment", awaiting_verification: "Verifying payment", paid: "Paid", processing: "Preparing",
  dispatched: "Dispatched", in_delivery: "In delivery", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
};
export const orderStatusLabel = (status: string) => ORDER_LABELS[status] ?? status;
export const ORDER_NEXT_STATUS: Record<string, "processing" | "dispatched" | "in_delivery" | "delivered" | undefined> = {
  paid: "processing", processing: "dispatched", dispatched: "in_delivery", in_delivery: "delivered",
};

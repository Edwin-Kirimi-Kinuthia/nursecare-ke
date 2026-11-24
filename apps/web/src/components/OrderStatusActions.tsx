"use client";
import { useState } from "react";
import { ORDER_NEXT_STATUS, orderStatusLabel } from "@carebora/shared";
import type { VendorOrder } from "@carebora/api-client";
import { api } from "@/lib/api";
export default function OrderStatusActions({ order, admin = false, onUpdated }: { order: VendorOrder; admin?: boolean; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = ORDER_NEXT_STATUS[order.status];
  const deliverable = ["paid", "processing", "dispatched", "in_delivery"].includes(order.status);
  const [requested, setRequested] = useState(false);
  if (!next && order.status !== "delivered") return null;
  async function advance(status = next) {
    if (!status || busy) return;
    setBusy(true); setError("");
    try {
      if (admin) await api.adminPatchVendorOrder(order.id, { status });
      else await api.patchVendorOrder(order.id, { status });
      await onUpdated();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update this order."); }
    finally { setBusy(false); }
  }
  async function requestReview() {
    setBusy(true); setError("");
    try { await api.requestOrderReview(order.id, admin); setRequested(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not request review"); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 flex flex-wrap gap-2">
    {next && next !== "delivered" && <button disabled={busy} onClick={() => advance()} className="button-secondary text-sm">{busy ? "Updating…" : `Mark ${orderStatusLabel(next).toLowerCase()}`}</button>}
    {deliverable && <button disabled={busy} onClick={() => { if (window.confirm("Confirm the client received this order? We will invite them to review the pharmacy.")) void advance("delivered"); }} className="button-primary text-sm">Mark delivered & request review</button>}
    {order.status === "delivered" && <button disabled={busy || requested} onClick={requestReview} className="button-secondary text-sm">{requested ? "Review requested" : "Request client review"}</button>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
  </div>;
}

"use client";
import { useState } from "react";
import { ORDER_NEXT_STATUS, orderStatusLabel } from "@carebora/shared";
import type { VendorOrder } from "@carebora/api-client";
import { api } from "@/lib/api";
export default function OrderStatusActions({ order, admin = false, dropdown = false, onUpdated }: { order: VendorOrder; admin?: boolean; dropdown?: boolean; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const next = ORDER_NEXT_STATUS[order.status];
  const deliverable = ["paid", "processing", "dispatched", "in_delivery"].includes(order.status);
  const [requested, setRequested] = useState("");
  if (!next && order.status !== "delivered") return null;
  async function advance(status = next) {
    if (!status || busy) return;
    setBusy(true); setError("");
    try {
      if (admin) await api.adminPatchVendorOrder(order.id, { status });
      else await api.patchVendorOrder(order.id, { status });
      setStage("");
      await onUpdated();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update this order."); }
    finally { setBusy(false); }
  }
  async function requestReview() {
    setBusy(true); setError("");
    try { const r = await api.requestOrderReview(order.id, admin); setRequested(r.status === "already_reviewed" ? "Client has already reviewed" : "Review email sent"); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not request review"); }
    finally { setBusy(false); }
  }
  return <div className="mt-3 flex flex-wrap gap-2">
    {dropdown ? next && <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-medium">Order stage<select aria-label="Order stage" value={stage || order.status} disabled={busy} onChange={e => setStage(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
      <option value={order.status}>{orderStatusLabel(order.status)} (current)</option>
      {(["processing", "dispatched", "in_delivery", "delivered"] as const).filter(s => s !== order.status).map(s => <option key={s} value={s} disabled={s !== next && !(s === "delivered" && deliverable)}>{orderStatusLabel(s)}</option>)}
    </select></label><button className="button-primary" disabled={busy || !stage || stage === order.status} onClick={() => { if (stage !== "delivered" || window.confirm("Confirm the client received this order? You can request a review after delivery.")) void advance(stage as typeof next); }}>{busy ? "Updating…" : "Update order stage"}</button></div> : <>
    {next && next !== "delivered" && <button disabled={busy} onClick={() => advance()} className="button-secondary text-sm">{busy ? "Updating…" : `Mark ${orderStatusLabel(next).toLowerCase()}`}</button>}
    {deliverable && <button disabled={busy} onClick={() => { if (window.confirm("Confirm the client received this order? You can request a review after delivery.")) void advance("delivered"); }} className="button-primary text-sm">Mark delivered</button>}
    </>}
    {order.status === "delivered" && <button disabled={busy || !!requested} onClick={requestReview} className="button-secondary text-sm">{requested || "Request client review"}</button>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
  </div>;
}

"use client";
import { useState } from "react";
import { ORDER_NEXT_STATUS, orderStatusLabel } from "@carebora/shared";
import type { VendorOrder } from "@carebora/api-client";
import { api } from "@/lib/api";
export default function OrderStatusActions({ order, admin = false, onUpdated }: { order: VendorOrder; admin?: boolean; onUpdated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = ORDER_NEXT_STATUS[order.status];
  if (!next) return null;
  async function advance() {
    if (!next || busy) return;
    setBusy(true); setError("");
    try {
      if (admin) await api.adminPatchVendorOrder(order.id, { status: next });
      else await api.patchVendorOrder(order.id, { status: next });
      await onUpdated();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update this order."); }
    finally { setBusy(false); }
  }
  return <div className="mt-3"><button disabled={busy} onClick={advance} className="button-primary text-sm">{busy ? "Updating…" : `Mark ${orderStatusLabel(next).toLowerCase()}`}</button>{error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}</div>;
}

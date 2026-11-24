import { useState } from "react";
import type { VendorOrder } from "@carebora/api-client";
import { ORDER_NEXT_STATUS, orderStatusLabel } from "@carebora/shared";
import { api } from "@/lib/api";
import { Button } from "@/ui/Button";
import { Banner } from "@/ui/parts";
export function OrderStatusActions({ order, admin = false, onUpdated }: { order: VendorOrder; admin?: boolean; onUpdated: () => Promise<void> }) {
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
  return <>{error && <Banner tone="danger">{error}</Banner>}<Button title={`Mark ${orderStatusLabel(next).toLowerCase()}`} size="sm" loading={busy} onPress={advance} /></>;
}

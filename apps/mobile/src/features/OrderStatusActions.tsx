import { Alert } from "react-native";
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
  return <>{error && <Banner tone="danger">{error}</Banner>}
    {next && next !== "delivered" && <Button title={`Mark ${orderStatusLabel(next).toLowerCase()}`} size="sm" loading={busy} onPress={() => advance()} />}
    {deliverable && <Button title="Mark delivered & request review" size="sm" loading={busy} onPress={() => Alert.alert("Confirm delivery", "Confirm that the client received this order. We will invite them to review the pharmacy.", [{text:"Cancel",style:"cancel"},{text:"Mark delivered",onPress:() => { void advance("delivered"); }}])} />}
    {order.status === "delivered" && <Button title={requested ? "Review requested" : "Request client review"} size="sm" loading={busy} disabled={requested} onPress={requestReview} />}
  </>;
}

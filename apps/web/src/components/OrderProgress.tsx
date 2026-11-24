import type { VendorOrder } from "@carebora/api-client";
import { orderStatusLabel } from "@carebora/shared";
import { when } from "@/lib/api";

const stages = ["paid", "processing", "dispatched", "in_delivery", "delivered"];
export default function OrderProgress({ order }: { order: VendorOrder }) {
  const current = stages.indexOf(order.status);
  const history = order.statusHistory?.length ? order.statusHistory : [{ id: order.id, status: order.status, createdAt: order.updatedAt }];
  return <section aria-label={`${order.organization.name} delivery progress`} className="mt-4">
    <p role="status" className="font-semibold text-teal-800">{orderStatusLabel(order.status)}</p>
    {current >= 0 && <ol className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Delivery stages">{stages.map((s, i) => <li key={s} aria-current={i === current ? "step" : undefined} className={`rounded-full px-3 py-2 ${i <= current ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-500"}`}>{orderStatusLabel(s)}</li>)}</ol>}
    <ol className="mt-3 space-y-1 text-sm text-slate-600" aria-label="Order status history">{history.map(e => <li key={e.id}>{orderStatusLabel(e.status)} · <time dateTime={e.createdAt}>{when(e.createdAt)}</time></li>)}</ol>
  </section>;
}

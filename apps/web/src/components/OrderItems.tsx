import type { OrderItem } from "@carebora/api-client";
import { kes } from "@/lib/api";

/** Use the purchased name and price snapshots, even if the catalogue changes. */
export default function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <ul aria-label="Ordered items" className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="break-words font-semibold text-slate-900">{item.drugName}</p>
            <p className="mt-1 text-xs text-slate-600">Quantity: {item.qty} · {kes(item.unitPriceKes)} each</p>
          </div>
          <span className="shrink-0 font-semibold text-slate-800">{kes(item.unitPriceKes * item.qty)}</span>
        </li>
      ))}
    </ul>
  );
}

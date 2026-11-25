"use client";
import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useSection, SectionShell } from "@/components/dashboard/section";
import OrderItems from "@/components/OrderItems";
import OrderProgress from "@/components/OrderProgress";
import OrderStatusActions from "@/components/OrderStatusActions";
export default function VendorOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const fetcher = useCallback(() => user ? api.getVendorOrder(id) : Promise.resolve(null), [user,id]);
  const { data: order, loading, error, reload } = useSection(fetcher);
  useEffect(() => { if (!user) return; const timer = setInterval(() => { if (document.visibilityState === "visible") void reload(); },15000); return () => clearInterval(timer); }, [user,reload]);
  return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-2xl font-semibold">Pharmacy order details</h1>
    {authLoading ? <p>Loading…</p> : !user ? <Link href="/login" className="button-primary mt-5">Sign in to view this order</Link> : <>
      <button className="button-secondary my-5" onClick={() => void reload()}>Refresh order</button>
      <SectionShell loading={loading && !order} error={error} onRetry={reload}>{order && <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div><h2 className="text-xl font-semibold">Order #{order.orderId.slice(0,8).toUpperCase()}</h2><p className="text-sm text-slate-500">{order.organization.name} · Vendor reference #{order.id.slice(0,8).toUpperCase()}</p><p className="text-sm text-slate-500">{when(order.createdAt)}</p></div>
        <section aria-label="Delivery details"><h3 className="font-semibold">Delivery details</h3><p>{order.order?.patient.fullName}</p><p>{order.order?.deliveryAddress}</p><p>Contact: {order.order?.phoneNumber}</p>{order.order?.deliveryNotes && <p className="whitespace-pre-wrap">Notes: {order.order.deliveryNotes}</p>}</section>
        <OrderItems items={order.items} /><p className="font-semibold">Total: {kes(order.subtotalKes)}</p><p>Payment: {order.order?.payment?.status.replaceAll("_"," ") ?? "unpaid"}</p>
        <OrderProgress order={order} /><section aria-label="Update delivery"><h3 className="font-semibold">Update delivery</h3><p className="mt-1 text-sm text-slate-500">Move through preparation, dispatch and delivery. Confirm receipt before marking delivered.</p><OrderStatusActions key={order.status} order={order} dropdown onUpdated={reload} /></section>
      </article>}</SectionShell>
    </>}
  </main>;
}

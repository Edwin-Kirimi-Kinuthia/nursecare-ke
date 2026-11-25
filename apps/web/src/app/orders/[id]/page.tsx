"use client";
import ServiceReviewForm from "@/components/ServiceReviewForm";
import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useSection, SectionShell } from "@/components/dashboard/section";
import OrderStatusActions from "@/components/OrderStatusActions";
import OrderProgress from "@/components/OrderProgress";
import OrderItems from "@/components/OrderItems";
import { api, kes, when } from "@/lib/api";
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const fetcher = useCallback(() => user ? api.getOrder(id) : Promise.resolve(null), [user, id]);
  const { data: order, loading, error, reload } = useSection(fetcher);
  useEffect(() => { if (!user) return; const timer = setInterval(() => { if (document.visibilityState === "visible") void reload(); }, 15_000); return () => clearInterval(timer); }, [user, reload]);
  return <div className="mx-auto max-w-4xl px-4 py-10"><h1 className="text-3xl font-semibold">Track pharmacy order</h1>
    {authLoading ? <p className="mt-6">Loading…</p> : !user ? <Link className="button-primary mt-6" href={`/login?next=${encodeURIComponent(`/orders/${id}`)}`}>Sign in to view this order</Link> : <>
    <button className="button-secondary my-5" onClick={() => void reload()}>Refresh delivery status</button>
    <SectionShell loading={loading && !order} error={error} onRetry={reload}>{order && <>
    <p className="mb-5 text-sm text-slate-600">Order #{order.id.slice(0,8).toUpperCase()} · {when(order.createdAt)}</p>
    {order.vendorOrders.map(v => <article id={`review-${v.id}`} key={v.id} className="mb-5 rounded-2xl border border-slate-200 p-5"><h2 className="text-lg font-semibold">{v.organization.name}</h2>{v.status === "delivered" && order.patient.id === user?.id && <ServiceReviewForm serviceType="vendor_order" subjectId={v.id} label={v.organization.name} />}
<OrderProgress order={v} />{user?.role === "admin" && <OrderStatusActions key={v.status} order={v} admin dropdown onUpdated={reload} />}<OrderItems items={v.items} /></article>)}
    <p className="mt-5">Deliver to: {order.deliveryAddress}</p><p className="mt-2 font-semibold">Total: {kes(order.totalKes)}</p><p className="mt-2 text-sm">Payment: {order.payment?.status.replaceAll("_", " ") ?? "Pending"}</p>
    </>}</SectionShell></>}
  </div>;
}

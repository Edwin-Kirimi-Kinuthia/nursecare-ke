"use client";
import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useSection, SectionShell } from "@/components/dashboard/section";
import { api, kes, when } from "@/lib/api";
import { orderStatusLabel } from "@carebora/shared";
export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const fetcher = useCallback(() => user ? api.listOrders({ limit: 50 }) : Promise.resolve(null), [user]);
  const { data, loading, error, reload } = useSection(fetcher);
  useEffect(() => { if (!user) return; const timer = setInterval(() => { if (document.visibilityState === "visible") void reload(); }, 15_000); return () => clearInterval(timer); }, [user, reload]);
  return <div className="mx-auto max-w-4xl px-4 py-10"><h1 className="text-3xl font-semibold">My pharmacy orders</h1>
    {authLoading ? <p className="mt-6">Loading…</p> : !user ? <Link className="button-primary mt-6" href="/login">Sign in to view your orders</Link> : <>
    <button className="button-secondary my-5" onClick={() => void reload()}>Refresh orders</button>
    <SectionShell loading={loading && !data} error={error} onRetry={reload} empty={data?.orders.length === 0} emptyText="No pharmacy orders yet."><div className="space-y-4">{data?.orders.map(o => <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-2xl border border-slate-200 p-5 hover:border-teal-500"><h2 className="font-semibold">Order #{o.id.slice(0,8).toUpperCase()}</h2><p className="mt-1 text-sm text-slate-500">{when(o.createdAt)} · {kes(o.totalKes)}</p>{o.vendorOrders.map(v => <p key={v.id} className="mt-2 text-sm">{v.organization.name} · {orderStatusLabel(v.status)}</p>)}<span className="mt-3 block font-medium text-teal-800">Track order →</span></Link>)}</div></SectionShell></>}
  </div>;
}

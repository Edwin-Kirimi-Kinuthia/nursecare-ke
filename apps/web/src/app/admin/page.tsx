"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CalendarDays, Wallet, ShoppingBag, HomeIcon, ShieldCheck,
  BadgeCheck, XCircle, ScrollText, LayoutDashboard,
} from "lucide-react";
import type {
  PlatformStats, AdminUserSummary, VerificationProvider, AuditLogEntry,
} from "@carebora/api-client";
import { api, kes } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Tab = "overview" | "users" | "verifications" | "audit";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [verifs, setVerifs] = useState<VerificationProvider[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  const fetchAll = useCallback(async () => {
    const [s, u, v, l] = await Promise.all([
      api.adminGetStats(),
      api.adminListUsers({ limit: 100 }),
      api.adminListVerifications({}),
      api.adminListAuditLogs({ limit: 50 }),
    ]);
    return { stats: s, users: u.users, verifs: v.providers, logs: l.logs };
  }, []);

  const apply = useCallback((d: Awaited<ReturnType<typeof fetchAll>>) => {
    setStats(d.stats); setUsers(d.users); setVerifs(d.verifs); setLogs(d.logs); setReady(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    let active = true;
    (async () => {
      const d = await fetchAll();
      if (active) apply(d);
    })();
    return () => { active = false; };
  }, [user, authLoading, router, fetchAll, apply]);

  async function review(userId: string, status: "verified" | "rejected") {
    await api.adminReviewVerification(userId, { status });
    apply(await fetchAll());
  }

  if (authLoading || !user || user.role !== "admin") {
    return <div className="mx-auto max-w-6xl px-4 py-16"><div className="h-40 rounded-2xl skeleton" /></div>;
  }

  const TABS: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "users", label: "Users", Icon: Users },
    { id: "verifications", label: "Verifications", Icon: ShieldCheck },
    { id: "audit", label: "Audit log", Icon: ScrollText },
  ];

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
            <ShieldCheck className="h-4 w-4" /> Admin
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Operations dashboard</h1>

          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat Icon={Users} label="Users" value={stats?.users.total} tone="teal" />
            <Stat Icon={CalendarDays} label="Appointments" value={stats?.appointments.total} tone="indigo" />
            <Stat Icon={Wallet} label="Revenue" value={stats ? kes(stats.payments.totalRevenueKes) : undefined} tone="emerald" />
            <Stat Icon={ShoppingBag} label="Orders" value={stats?.orders.total} tone="amber" />
            <Stat Icon={HomeIcon} label="Home visits" value={stats?.homeVisits.total} tone="rose" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === id ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {!ready ? (
          <div className="mt-6 h-64 rounded-2xl skeleton" />
        ) : (
          <div className="mt-6">
            {tab === "overview" && stats && <Overview stats={stats} />}
            {tab === "users" && <UsersTable users={users} />}
            {tab === "verifications" && <Verifications verifs={verifs} onReview={review} />}
            {tab === "audit" && <AuditTable logs={logs} />}
          </div>
        )}
      </section>
    </div>
  );
}

const TONES: Record<string, string> = {
  teal: "from-teal-500 to-emerald-600", indigo: "from-indigo-500 to-violet-600",
  emerald: "from-emerald-500 to-green-600", amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
};

function Stat({ Icon, label, value, tone }: { Icon: typeof Users; label: string; value: string | number | undefined; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${TONES[tone]} text-white`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="mt-3 text-2xl font-extrabold text-slate-900">{value ?? "—"}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Overview({ stats }: { stats: PlatformStats }) {
  const sections = [
    { title: "Users by role", data: stats.users.byRole },
    { title: "Appointments by status", data: stats.appointments.byStatus },
    { title: "Orders by status", data: stats.orders.byStatus },
    { title: "Home visits by status", data: stats.homeVisits.byStatus },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((s) => (
        <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900">{s.title}</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(s.data).length === 0 ? (
              <p className="text-sm text-slate-400">No data yet.</p>
            ) : Object.entries(s.data).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600">{k.replace(/_/g, " ")}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white sm:col-span-2">
        <h3 className="font-bold">Revenue</h3>
        <div className="mt-2 flex flex-wrap gap-6">
          <div><div className="text-2xl font-extrabold">{kes(stats.payments.totalRevenueKes)}</div><div className="text-xs text-teal-100">Total ({stats.payments.completedCount} payments)</div></div>
          <div><div className="text-2xl font-extrabold">{kes(stats.payments.platformFeeKes)}</div><div className="text-xs text-teal-100">Platform fees</div></div>
        </div>
      </div>
    </div>
  );
}

function UsersTable({ users }: { users: AdminUserSummary[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
              <td className="px-4 py-3 text-slate-500">{u.email}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{u.role}</span></td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {u.isActive ? "Active" : "Disabled"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Verifications({ verifs, onReview }: { verifs: VerificationProvider[]; onReview: (id: string, s: "verified" | "rejected") => void }) {
  if (verifs.length === 0) return <p className="py-10 text-center text-slate-400">No providers in the queue.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {verifs.map((v) => (
        <div key={v.userId} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-slate-900">{v.user.fullName}</div>
              <div className="text-sm text-teal-700">{v.specialty ?? "Clinician"}</div>
              <div className="mt-1 text-xs text-slate-400">{v.user.email} · Licence {v.licenceNumber ?? "—"}</div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
              v.verificationStatus === "verified" ? "bg-emerald-100 text-emerald-700"
              : v.verificationStatus === "rejected" ? "bg-rose-100 text-rose-700"
              : "bg-amber-100 text-amber-700"}`}>
              {v.verificationStatus.replace("_", " ")}
            </span>
          </div>
          {v.verificationStatus !== "verified" && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => onReview(v.userId, "verified")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <BadgeCheck className="h-4 w-4" /> Approve
              </button>
              <button onClick={() => onReview(v.userId, "rejected")} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AuditTable({ logs }: { logs: AuditLogEntry[] }) {
  if (logs.length === 0) return <p className="py-10 text-center text-slate-400">No audit entries yet.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-500">{new Date(l.createdAt).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              <td className="px-4 py-3 text-slate-700">{l.actor?.fullName ?? "System"}</td>
              <td className="px-4 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{l.action}</code></td>
              <td className="px-4 py-3 text-slate-500">{l.entityType ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

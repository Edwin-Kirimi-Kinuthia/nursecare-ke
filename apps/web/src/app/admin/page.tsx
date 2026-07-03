"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CalendarDays, Wallet, ShoppingBag, HomeIcon, ShieldCheck,
  BadgeCheck, XCircle, ScrollText, LayoutDashboard, Star, MessageSquare,
  Loader2, AlertCircle, RefreshCw, Eye, EyeOff, Pill, Plus, Pencil, Trash2, Power,
} from "lucide-react";
import type {
  PlatformStats, AdminUserSummary, VerificationProvider, AuditLogEntry, HomeVisit, Review,
  Appointment, Product, Order,
} from "@carebora/api-client";
import type { CreateProductInput } from "@carebora/shared";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

type Tab = "overview" | "appointments" | "users" | "verifications" | "pharmacy" | "orders" | "home-visits" | "reviews" | "audit";

const TONES: Record<string, string> = {
  teal: "from-teal-500 to-emerald-600", indigo: "from-indigo-500 to-violet-600",
  emerald: "from-emerald-500 to-green-600", amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
};

/** Fetches a section's data on mount; exposes loading / error / data + reload.
 *  Each section is independent, so one failing endpoint never blanks the others. */
function useSection<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

/** Uniform loading / error / empty shell so every section behaves the same. */
function SectionShell({
  loading, error, onRetry, empty, emptyText, children,
}: {
  loading: boolean; error: string | null; onRetry: () => void;
  empty?: boolean; emptyText?: string; children: React.ReactNode;
}) {
  if (loading) return <div className="grid h-52 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-300"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) {
    return (
      <div className="grid h-52 place-items-center rounded-2xl border border-rose-200 bg-rose-50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-rose-500" />
          <p className="mt-2 text-sm font-medium text-rose-700">{error}</p>
          <button onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }
  if (empty) return <div className="grid h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white"><p className="text-sm text-slate-400">{emptyText ?? "Nothing here yet."}</p></div>;
  return <>{children}</>;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, authLoading, router]);

  // Top stat cards load independently — never block the tabs below.
  const statsFetcher = useCallback(() => api.adminGetStats(), []);
  const statsSec = useSection(statsFetcher);
  const stats = statsSec.data;

  if (authLoading || !user || user.role !== "admin") {
    return <div className="mx-auto max-w-6xl px-4 py-16"><div className="h-40 rounded-2xl skeleton" /></div>;
  }

  const TABS: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "appointments", label: "Appointments", Icon: CalendarDays },
    { id: "users", label: "Users", Icon: Users },
    { id: "verifications", label: "Applications", Icon: ShieldCheck },
    { id: "pharmacy", label: "Pharmacy", Icon: Pill },
    { id: "orders", label: "Orders", Icon: ShoppingBag },
    { id: "home-visits", label: "Home visits", Icon: HomeIcon },
    { id: "reviews", label: "Reviews", Icon: Star },
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

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat Icon={Users} label="Users" value={stats?.users.total} tone="teal" loading={statsSec.loading} />
            <Stat Icon={CalendarDays} label="Appointments" value={stats?.appointments.total} tone="indigo" loading={statsSec.loading} />
            <Stat Icon={Wallet} label="Revenue" value={stats ? kes(stats.payments.totalRevenueKes) : undefined} tone="emerald" loading={statsSec.loading} />
            <Stat Icon={ShoppingBag} label="Orders" value={stats?.orders.total} tone="amber" loading={statsSec.loading} />
            <Stat Icon={HomeIcon} label="Home visits" value={stats?.homeVisits.total} tone="rose" loading={statsSec.loading} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
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

        <div className="mt-6">
          {tab === "overview" && <OverviewTab stats={stats} loading={statsSec.loading} error={statsSec.error} onRetry={statsSec.reload} />}
          {tab === "appointments" && <AppointmentsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "verifications" && <VerificationsTab />}
          {tab === "pharmacy" && <PharmacyTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "home-visits" && <HomeVisitsTab />}
          {tab === "reviews" && <ReviewsTab />}
          {tab === "audit" && <AuditTab />}
        </div>
      </section>
    </div>
  );
}

function Stat({ Icon, label, value, tone, loading }: { Icon: typeof Users; label: string; value: string | number | undefined; tone: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${TONES[tone]} text-white`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="mt-3 text-2xl font-extrabold text-slate-900">{loading ? <span className="text-slate-300">…</span> : value ?? "—"}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ stats, loading, error, onRetry }: { stats: PlatformStats | null; loading: boolean; error: string | null; onRetry: () => void }) {
  return (
    <SectionShell loading={loading} error={error} onRetry={onRetry} empty={!stats} emptyText="No statistics yet.">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "Users by role", data: stats.users.byRole },
            { title: "Appointments by status", data: stats.appointments.byStatus },
            { title: "Orders by status", data: stats.orders.byStatus },
            { title: "Home visits by status", data: stats.homeVisits.byStatus },
          ].map((s) => (
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
      )}
    </SectionShell>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
const ROLE_FILTERS = ["all", "patient", "doctor", "nurse", "physio", "pharmacy", "admin"] as const;

function UsersTab() {
  const fetcher = useCallback(() => api.adminListUsers({ limit: 100 }).then((r) => r.users), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const users = (data ?? []).filter((u) => roleFilter === "all" || u.role === roleFilter);

  async function toggleActive(u: AdminUserSummary) {
    setBusyId(u.id);
    try { await api.adminPatchUser(u.id, { isActive: !u.isActive }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No users yet.">
      <div className="mb-3 flex flex-wrap gap-1">
        {ROLE_FILTERS.map((r) => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${roleFilter === r ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {r}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: AdminUserSummary) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">{u.role}</span></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "admin" && (
                    <button onClick={() => toggleActive(u)} disabled={busyId === u.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${u.isActive ? "border border-rose-200 text-rose-600 hover:bg-rose-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                      <Power className="h-3.5 w-3.5" /> {u.isActive ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

// ── Verifications ───────────────────────────────────────────────────────────────
function VerificationsTab() {
  const fetcher = useCallback(() => api.adminListVerifications({}).then((r) => r.providers), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const verifs = data ?? [];

  async function review(userId: string, status: "verified" | "rejected") {
    try { await api.adminReviewVerification(userId, { status }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to update"); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={verifs.length === 0} emptyText="No providers in the queue.">
      <div className="grid gap-4 sm:grid-cols-2">
        {verifs.map((v: VerificationProvider) => (
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
                <button onClick={() => review(v.userId, "verified")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  <BadgeCheck className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => review(v.userId, "rejected")} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ── Home visits ─────────────────────────────────────────────────────────────────
const VISIT_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", assigned: "bg-indigo-100 text-indigo-700",
  paid: "bg-blue-100 text-blue-700", en_route: "bg-violet-100 text-violet-700",
  arrived: "bg-teal-100 text-teal-700", completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function HomeVisitsTab() {
  const fetcher = useCallback(() => api.listHomeVisits({ limit: 50 }).then((r) => r.visits), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const visits = data ?? [];

  const [assigning, setAssigning] = useState<HomeVisit | null>(null);
  const [providerId, setProviderId] = useState("");
  const [feeKes, setFeeKes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!assigning) return;
    setErr(null); setBusy(true);
    try {
      await api.assignHomeVisit(assigning.id, { providerId, feeKes: parseInt(feeKes, 10), scheduledAt: new Date(scheduledAt).toISOString() });
      setAssigning(null); await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to assign");
    } finally { setBusy(false); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={visits.length === 0} emptyText="No home visit requests yet.">
      <div className="space-y-3">
        {visits.map((v: HomeVisit) => (
          <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold capitalize text-slate-900">{v.specialty} · <span className="text-teal-700">{v.urgency}</span></div>
                <div className="mt-0.5 text-xs text-slate-400">{v.patient.fullName} · {when(v.createdAt)}</div>
                <p className="mt-1 text-sm text-slate-600">{v.description}</p>
                <div className="mt-1 text-xs text-slate-400">{v.address}, {v.county}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${VISIT_STATUS_CLS[v.status] ?? ""}`}>{v.status.replace("_", " ")}</span>
                {v.status === "pending" && (
                  <button onClick={() => { setAssigning(v); setProviderId(""); setFeeKes(""); setScheduledAt(""); setErr(null); }}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Assign</button>
                )}
              </div>
            </div>
            {v.provider && (
              <div className="mt-2 text-xs text-slate-500">
                Provider: <span className="font-medium text-slate-700">{v.provider.user.fullName}</span>
                {v.feeKes ? ` · ${kes(v.feeKes)}` : ""}{v.scheduledAt ? ` · ${when(v.scheduledAt)}` : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Assign provider</h2>
            <p className="mt-1 text-sm text-slate-500">{assigning.specialty} visit for {assigning.patient.fullName}</p>
            <form onSubmit={assign} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Provider user ID</label>
                <input required value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="UUID of the provider"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <p className="mt-1 text-xs text-slate-400">Find the provider&apos;s ID in the Users tab.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fee (KES)</label>
                  <input required type="number" min="1" value={feeKes} onChange={(e) => setFeeKes(e.target.value)} placeholder="e.g. 2500"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Scheduled at</label>
                  <input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              {err && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Assigning…" : "Assign provider"}</button>
                <button type="button" onClick={() => setAssigning(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

// ── Reviews (moderation) ─────────────────────────────────────────────────────────
function ReviewsTab() {
  const fetcher = useCallback(() => api.adminListReviews({ limit: 100 }).then((r) => r.reviews), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const reviews = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  async function moderate(r: Review) {
    setBusyId(r.id);
    try { await api.adminModerateReview(r.id, { isVisible: !r.isVisible }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={reviews.length === 0} emptyText="No reviews yet.">
      <div className="space-y-3">
        {reviews.map((r: Review) => (
          <div key={r.id} className={`rounded-2xl border p-5 ${r.isVisible ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "text-slate-200"}`} />)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{r.patient.fullName}</span>
                  {r.provider && <span className="text-xs text-slate-400">→ {r.provider.user.fullName}</span>}
                  {!r.isVisible && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">Hidden</span>}
                </div>
                {r.comment && <p className="mt-1.5 text-sm text-slate-600">&ldquo;{r.comment}&rdquo;</p>}
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MessageSquare className="h-3 w-3" /> {when(r.createdAt)}</div>
              </div>
              <button
                onClick={() => moderate(r)}
                disabled={busyId === r.id}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                  r.isVisible ? "border border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {r.isVisible ? <><EyeOff className="h-4 w-4" /> Hide</> : <><Eye className="h-4 w-4" /> Show</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ── Audit log ─────────────────────────────────────────────────────────────────
function AuditTab() {
  const fetcher = useCallback(() => api.adminListAuditLogs({ limit: 50 }).then((r) => r.logs), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const logs = data ?? [];
  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={logs.length === 0} emptyText="No audit entries yet.">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l: AuditLogEntry) => (
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
    </SectionShell>
  );
}

// ── Appointments oversight ───────────────────────────────────────────────────────
const APPT_STATUS = ["all", "requested", "confirmed", "completed", "cancelled", "no_show"] as const;
const APPT_STATUS_CLS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700", confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-200 text-slate-600", cancelled: "bg-rose-100 text-rose-700", no_show: "bg-rose-100 text-rose-700",
};

function AppointmentsTab() {
  const fetcher = useCallback(() => api.adminListAppointments({ limit: 50 }).then((r) => r.appointments), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const [filter, setFilter] = useState<(typeof APPT_STATUS)[number]>("all");
  const appts = (data ?? []).filter((a) => filter === "all" || a.status === filter);

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No appointments yet.">
      <div className="mb-3 flex flex-wrap gap-1">
        {APPT_STATUS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${filter === s ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {appts.map((a: Appointment) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{a.patient?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{a.provider?.user?.fullName ?? "—"}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{a.appointmentType.replace("_", " ")}</td>
                <td className="px-4 py-3 text-slate-500">{a.slot ? when(a.slot.startsAt) : "—"}</td>
                <td className="px-4 py-3 text-slate-700">{kes(a.feeKes)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${APPT_STATUS_CLS[a.status] ?? "bg-slate-100 text-slate-600"}`}>{a.status.replace("_", " ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

// ── Pharmacy catalogue management ────────────────────────────────────────────────
const EMPTY_PRODUCT: CreateProductInput = { name: "", category: "", priceKes: 0, stockQty: 0, requiresPrescription: false };

function PharmacyTab() {
  const fetcher = useCallback(() => api.adminListProducts({ limit: 50 }).then((r) => r.products), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const products = data ?? [];
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  async function remove(p: Product) {
    if (!confirm(`Remove "${p.name}" from the catalogue?`)) return;
    try { await api.adminDeleteProduct(p.id); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to remove"); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={false}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{products.length} products</p>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>
      {products.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white"><p className="text-sm text-slate-400">No products yet.</p></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p: Product) => (
                <tr key={p.id} className={`hover:bg-slate-50 ${!p.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category}</td>
                  <td className="px-4 py-3 text-slate-700">{kes(p.priceKes)}</td>
                  <td className="px-4 py-3"><span className={`font-medium ${p.stockQty === 0 ? "text-rose-600" : p.stockQty < 20 ? "text-amber-600" : "text-slate-700"}`}>{p.stockQty}</span></td>
                  <td className="px-4 py-3">{p.requiresPrescription ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Rx</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">OTC</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(p)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(p)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" title="Remove"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ProductModal product={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); }} />}
    </SectionShell>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateProductInput>(product ? {
    name: product.name, genericName: product.genericName ?? undefined, description: product.description ?? undefined,
    category: product.category, priceKes: product.priceKes, stockQty: product.stockQty, requiresPrescription: product.requiresPrescription,
  } : { ...EMPTY_PRODUCT });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof CreateProductInput>(k: K, v: CreateProductInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (product) await api.adminUpdateProduct(product.id, form);
      else await api.adminCreateProduct(form);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">{product ? "Edit product" : "Add product"}</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Product name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.genericName ?? ""} onChange={(e) => set("genericName", e.target.value || undefined)} placeholder="Generic name (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input required value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Category e.g. Pain Relief" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Price (KES)</label>
              <input required type="number" min="1" value={form.priceKes || ""} onChange={(e) => set("priceKes", parseInt(e.target.value, 10) || 0)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Stock quantity</label>
              <input required type="number" min="0" value={form.stockQty ?? 0} onChange={(e) => set("stockQty", parseInt(e.target.value, 10) || 0)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value || undefined)} placeholder="Description (optional)" rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.requiresPrescription ?? false} onChange={(e) => set("requiresPrescription", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
            Requires prescription (Rx)
          </label>
          {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : product ? "Save changes" : "Add product"}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Orders oversight ─────────────────────────────────────────────────────────────
const ORDER_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700",
  dispatched: "bg-violet-100 text-violet-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
};
const NEXT_STATUS: Record<string, "processing" | "dispatched" | "delivered" | null> = {
  paid: "processing", processing: "dispatched", dispatched: "delivered",
};

function OrdersTab() {
  const fetcher = useCallback(() => api.listOrders({ limit: 50 }).then((r) => r.orders), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const orders = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  async function advance(o: Order) {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    setBusyId(o.id);
    try { await api.patchOrder(o.id, { status: next }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={orders.length === 0} emptyText="No orders yet.">
      <div className="space-y-3">
        {orders.map((o: Order) => (
          <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">Order #{o.id.slice(0, 8).toUpperCase()}</div>
                <div className="mt-0.5 text-xs text-slate-400">{o.patient.fullName} · {when(o.createdAt)}</div>
                <div className="mt-1 text-sm text-slate-600">{o.items.length} item(s) · <span className="font-semibold text-slate-800">{kes(o.totalKes)}</span></div>
                <div className="mt-0.5 text-xs text-slate-400">{o.deliveryAddress}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ORDER_STATUS_CLS[o.status] ?? "bg-slate-100 text-slate-600"}`}>{o.status}</span>
                {NEXT_STATUS[o.status] && (
                  <button onClick={() => advance(o)} disabled={busyId === o.id}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                    Mark {NEXT_STATUS[o.status]}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

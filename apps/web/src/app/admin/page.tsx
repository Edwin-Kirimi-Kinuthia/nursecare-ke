"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CalendarDays, Wallet, ShoppingBag, HomeIcon, ShieldCheck,
  BadgeCheck, XCircle, ScrollText, LayoutDashboard, Star, MessageSquare,
  Loader2, Eye, EyeOff, Pill, Plus, Pencil, Trash2, Power,
  Upload, ImageIcon, X, Building2, Ban, AlertTriangle, ChevronLeft, ChevronRight, Send,
} from "lucide-react";
import type {
  PlatformStats, AdminUserSummary, VerificationProvider, AuditLogEntry, HomeVisit, Review,
  Appointment, Drug, Order, ProviderPublicProfile, Organization, OrgBranch, SupportTicket,
} from "@carebora/api-client";
import type { CreateDrugInput, TillVerificationItem, AdminCreateProviderInput, LaunchResetPreview } from "@carebora/shared";
import {
  LAUNCH_RESET_CONFIRM_PHRASE,
  SUPPORT_CATEGORY_LABELS, SUPPORT_DOCUMENT_LABELS, SUPPORT_STATUS_LABELS,
  type SupportStatus,
} from "@carebora/shared";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { IS_TILL_MODE } from "@/lib/payments";
import { useSection, SectionShell } from "@/components/dashboard/section";
import { fileToDataUrl } from "@/lib/files";
import { PhoneField } from "@/components/PhoneField";
import { NameFields, EMPTY_NAME, composeFullName, type NameParts } from "@/components/NameFields";

type Tab = "overview" | "appointments" | "users" | "verifications" | "organizations" | "pharmacy" | "orders" | "home-visits" | "support" | "reviews" | "audit" | "pay-verify";

const TONES: Record<string, string> = {
  teal: "from-teal-500 to-emerald-600", indigo: "from-indigo-500 to-violet-600",
  emerald: "from-emerald-500 to-green-600", amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (dir: number) => tabsRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });

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
    return <div className="mx-auto max-w-6xl px-4 py-10"><div className="h-40 rounded-2xl skeleton" /></div>;
  }

  const TABS: { id: Tab; label: string; Icon: typeof Users }[] = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "appointments", label: "Appointments", Icon: CalendarDays },
    { id: "users", label: "Users", Icon: Users },
    { id: "verifications", label: "Applications", Icon: ShieldCheck },
    { id: "organizations", label: "Vendors", Icon: Building2 },
    { id: "pharmacy", label: "Pharmacy", Icon: Pill },
    { id: "orders", label: "Orders", Icon: ShoppingBag },
    { id: "home-visits", label: "Home visits", Icon: HomeIcon },
    { id: "support", label: "Messages", Icon: MessageSquare },
    ...(IS_TILL_MODE ? [{ id: "pay-verify" as Tab, label: "Verify payments", Icon: Wallet }] : []),
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
        <div className="flex items-center gap-1.5">
          <button
            type="button" onClick={() => scrollTabs(-1)} aria-label="Scroll tabs left"
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div ref={tabsRef} className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                  tab === id ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={() => scrollTabs(1)} aria-label="Scroll tabs right"
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab stats={stats} loading={statsSec.loading} error={statsSec.error} onRetry={statsSec.reload} />}
          {tab === "appointments" && <AppointmentsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "verifications" && <VerificationsTab />}
          {tab === "organizations" && <OrganizationsTab />}
          {tab === "pharmacy" && <PharmacyTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "home-visits" && <HomeVisitsTab />}
          {tab === "pay-verify" && <PayVerifyTab />}
          {tab === "support" && <SupportTab />}
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
            <h3 className="font-bold">Total revenue</h3>
            <div className="mt-1 text-3xl font-extrabold">{kes(stats.payments.totalRevenueKes)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><div className="text-lg font-extrabold">{kes(stats.payments.breakdown?.consultationsKes ?? 0)}</div><div className="text-xs text-teal-100">Consultations</div></div>
              <div><div className="text-lg font-extrabold">{kes(stats.payments.breakdown?.pharmacyKes ?? 0)}</div><div className="text-xs text-teal-100">Pharmacy</div></div>
              <div><div className="text-lg font-extrabold">{kes(stats.payments.breakdown?.homeVisitsKes ?? 0)}</div><div className="text-xs text-teal-100">Home visits</div></div>
              <div><div className="text-lg font-extrabold">{kes(stats.payments.platformFeeKes)}</div><div className="text-xs text-teal-100">Platform fees</div></div>
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
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const users = (data ?? []).filter((u) => roleFilter === "all" || u.role === roleFilter);

  async function toggleActive(u: AdminUserSummary) {
    setBusyId(u.id);
    try { await api.adminPatchUser(u.id, { isActive: !u.isActive }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={(data ?? []).length === 0} emptyText="No users yet.">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {ROLE_FILTERS.map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${roleFilter === r ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {r}
            </button>
          ))}
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Create provider account
        </button>
      </div>
      {notice && <p className="mb-3 rounded-xl bg-teal-50 px-4 py-2.5 text-sm text-teal-700">{notice}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
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
      {creating && (
        <CreateProviderModal
          onClose={() => setCreating(false)}
          onCreated={async (email) => {
            setCreating(false);
            setNotice(`Account created — an invite to set a password was emailed to ${email}.`);
            await reload();
          }}
        />
      )}
    </SectionShell>
  );
}

const PROVIDER_ROLE_OPTIONS = ["doctor", "nurse", "physio", "pharmacy"] as const;
const EMPTY_PROVIDER: AdminCreateProviderInput = { fullName: "", email: "", role: "doctor" };

function CreateProviderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string) => void }) {
  const [form, setForm] = useState<AdminCreateProviderInput>({ ...EMPTY_PROVIDER });
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof AdminCreateProviderInput>(k: K, v: AdminCreateProviderInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onPickFile(key: "avatarUrl" | "licenceDocumentUrl", file: File | undefined) {
    if (!file) return;
    try { set(key, await fileToDataUrl(file, key === "avatarUrl" ? 480 : 1600)); }
    catch { setErr("Could not read that file."); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.adminCreateProvider({ ...form, fullName: composeFullName(name) });
      onCreated(form.email);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to create account"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">Create provider account</h2>
        <p className="mt-1 text-xs text-slate-400">
          Skips the public apply-and-review queue — use this once you&apos;ve already vetted them
          yourself. They&apos;ll get an email to set their own password.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <NameFields
            value={name} onChange={setName}
            inputClassName="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            labelClassName="text-xs font-medium text-slate-500"
          />
          <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <PhoneField label="Phone (optional)" value={form.phone ?? ""} onChange={(v) => set("phone", v || undefined)} />
          <select value={form.role} onChange={(e) => set("role", e.target.value as AdminCreateProviderInput["role"])}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-teal-500">
            {PROVIDER_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.specialty ?? ""} onChange={(e) => set("specialty", e.target.value || undefined)} placeholder="Specialty (optional)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input value={form.licenceNumber ?? ""} onChange={(e) => set("licenceNumber", e.target.value || undefined)} placeholder="Licence number (optional)"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Passport photo (optional)</span>
              <input type="file" accept="image/*" onChange={(e) => onPickFile("avatarUrl", e.target.files?.[0])}
                className="mt-1 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600" />
              {form.avatarUrl && <span className="mt-1 block text-xs text-teal-700">Photo attached ✓</span>}
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Licence document (optional)</span>
              <input type="file" accept="image/*,.pdf" onChange={(e) => onPickFile("licenceDocumentUrl", e.target.files?.[0])}
                className="mt-1 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-slate-600" />
              {form.licenceDocumentUrl && <span className="mt-1 block text-xs text-teal-700">Document attached ✓</span>}
            </label>
          </div>
          {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy ? "Creating…" : "Create & send invite"}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
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
        {verifs.map((v: VerificationProvider) => {
          const licenceDoc = v.user.verificationDocuments.find((d) => d.type === "practice_licence");
          return (
          <div key={v.userId} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {v.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.user.avatarUrl} alt={v.user.fullName} className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover" />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 text-lg font-bold text-teal-700">
                    {v.user.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-900">{v.user.fullName}</div>
                  <div className="text-sm text-teal-700">{v.specialty ?? "Clinician"}</div>
                  <div className="mt-1 text-xs text-slate-400">{v.user.email} · Licence {v.licenceNumber ?? "—"}</div>
                  {licenceDoc && (
                    <a href={licenceDoc.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-teal-700 hover:underline">
                      View licence document →
                    </a>
                  )}
                </div>
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
          );
        })}
      </div>
    </SectionShell>
  );
}

// ── Organizations (vendor businesses) ────────────────────────────────────────────
const ORG_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", in_review: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700", suspended: "bg-rose-100 text-rose-700",
  rejected: "bg-rose-100 text-rose-700",
};

function OrganizationsTab() {
  const fetcher = useCallback(() => api.adminListOrganizations({ limit: 100 }).then((r) => r.organizations), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const orgs = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");

  const filtered = orgs.filter((o) => {
    if (filter === "all") return true;
    if (filter === "pending") return o.status === "pending" || o.status === "in_review";
    return o.status === filter;
  });

  async function review(org: Organization, status: "approved" | "rejected" | "suspended") {
    setBusyId(org.id);
    try { await api.adminReviewOrganization(org.id, { status }); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={orgs.length === 0} emptyText="No vendor applications yet.">
      <div className="mb-3 flex flex-wrap gap-1">
        {(["all", "pending", "approved", "suspended"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${filter === f ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((o: Organization & { branches: OrgBranch[] }) => (
          <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-teal-600" />
                  <span className="font-bold text-slate-900">{o.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{o.type}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Licence {o.licenceNumber ?? "—"} · {o.branches.length} branch(es)
                  {o.branches[0] && ` · ${o.branches[0].county}`}
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ORG_STATUS_CLS[o.status] ?? ""}`}>
                {o.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(o.status === "pending" || o.status === "in_review") && (
                <>
                  <button onClick={() => review(o, "approved")} disabled={busyId === o.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <BadgeCheck className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => review(o, "rejected")} disabled={busyId === o.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </>
              )}
              {o.status === "approved" && (
                <button onClick={() => review(o, "suspended")} disabled={busyId === o.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                  <Ban className="h-4 w-4" /> Suspend
                </button>
              )}
              {o.status === "suspended" && (
                <button onClick={() => review(o, "approved")} disabled={busyId === o.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  <BadgeCheck className="h-4 w-4" /> Reinstate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

// ── Home visits ─────────────────────────────────────────────────────────────────
const VISIT_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", awaiting_verification: "bg-orange-100 text-orange-700",
  assigned: "bg-indigo-100 text-indigo-700",
  paid: "bg-blue-100 text-blue-700", en_route: "bg-violet-100 text-violet-700",
  arrived: "bg-teal-100 text-teal-700", completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const TILL_CTX_LABEL: Record<string, string> = {
  appointment: "Consultation",
  order: "Pharmacy order",
  home_visit: "Home visit",
};

function PayVerifyTab() {
  const fetcher = useCallback(() => api.adminListTillVerifications().then((r) => r.items), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const items = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function decide(item: TillVerificationItem, approve: boolean) {
    setErr(null); setBusyId(item.id);
    try {
      await api.adminVerifyTillPayment({ id: item.id, approve });
      await reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update");
    } finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={items.length === 0} emptyText="No payments waiting for verification. 🎉">
      <div className="mb-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        Confirm each M-Pesa code against your Till statement, then approve to unlock the service (or reject to let the patient re-submit).
      </div>
      {err && <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}
      <div className="space-y-3">
        {items.map((item: TillVerificationItem) => (
          <div key={`${item.context}-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{TILL_CTX_LABEL[item.context] ?? item.context}</span>
                  <span className="text-lg font-extrabold text-teal-700">{kes(item.amountKes)}</span>
                </div>
                <div className="mt-1 font-semibold text-slate-900">{item.patientName}</div>
                <p className="text-sm text-slate-600">{item.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span>Code: <span className="font-mono font-semibold uppercase tracking-wide text-slate-700">{item.code}</span></span>
                  {item.phone && <span>· {item.phone}</span>}
                  <span>· {when(item.submittedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decide(item, true)} disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />} Approve
                </button>
                <button onClick={() => decide(item, false)} disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

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

  const [providers, setProviders] = useState<ProviderPublicProfile[]>([]);
  useEffect(() => {
    api.listProviders({ limit: 50 }).then((r) => setProviders(r.providers)).catch(() => { /* ignore */ });
  }, []);

  // Providers relevant to the requested specialty (nurse/physio/doctor), else all.
  const eligible = assigning
    ? providers.filter((p) => p.user.role === assigning.specialty)
    : providers;
  const providerOptions = eligible.length ? eligible : providers;

  function openAssign(v: HomeVisit) {
    setAssigning(v); setProviderId(""); setFeeKes(""); setScheduledAt(""); setErr(null);
  }

  function selectProvider(id: string) {
    setProviderId(id);
    const p = providers.find((x) => x.userId === id);
    if (p?.homeVisitFeeKes) setFeeKes(String(p.homeVisitFeeKes)); // prefill their home-visit fee
  }

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
                  <button onClick={() => openAssign(v)}
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
          <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Assign provider</h2>
            <p className="mt-1 text-sm text-slate-500">{assigning.specialty} visit for {assigning.patient.fullName}</p>
            <form onSubmit={assign} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Provider</label>
                <select required value={providerId} onChange={(e) => selectProvider(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="" disabled>Select a provider…</option>
                  {providerOptions.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.user.fullName}{p.specialty ? ` — ${p.specialty}` : ""}{p.town ? ` · ${p.town}` : ""}
                    </option>
                  ))}
                </select>
                {providerOptions.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">No verified providers loaded yet.</p>
                )}
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
    <div>
      <LaunchResetPanel />
      <SectionShell loading={loading} error={error} onRetry={reload} empty={logs.length === 0} emptyText="No audit entries yet.">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
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
    </div>
  );
}

const RESET_PREVIEW_ROWS: { key: keyof LaunchResetPreview; label: string }[] = [
  { key: "nonAdminUsers", label: "Non-admin users" },
  { key: "organizations", label: "Organizations (vendors)" },
  { key: "appointments", label: "Appointments" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "homeVisits", label: "Home visits" },
  { key: "labOrders", label: "Lab orders" },
  { key: "ambulanceRequests", label: "Ambulance requests" },
  { key: "reviews", label: "Reviews" },
];

/** One-time control to clear seed/demo data before real signups start. Admin accounts and the drug catalogue are untouched. */
function LaunchResetPanel() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<LaunchResetPreview | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  async function loadPreview() {
    setErr(null); setBusy(true);
    try { setPreview(await api.adminPreviewLaunchReset()); setOpen(true); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to load preview"); }
    finally { setBusy(false); }
  }

  async function run() {
    if (confirmText !== LAUNCH_RESET_CONFIRM_PHRASE) return;
    if (!confirm("This permanently deletes every non-admin user and organization, and everything linked to them. This cannot be undone. Continue?")) return;
    setErr(null); setBusy(true);
    try {
      const { deletedUsers } = await api.adminPerformLaunchReset();
      setResult(deletedUsers);
      setOpen(false); setPreview(null); setConfirmText("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Reset failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <div className="flex items-center gap-2 font-bold text-rose-900"><AlertTriangle className="h-5 w-5" /> Danger zone — launch reset</div>
      <p className="mt-1 text-sm text-rose-700">
        Permanently deletes every seeded/demo user and organization (and their appointments, orders, payments, reviews, …)
        so real signups start from zero. Admin accounts and the shared drug catalogue are kept.
      </p>

      {result !== null && (
        <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">Done — removed {result} user(s) and everything linked to them.</p>
      )}
      {err && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-rose-700">{err}</p>}

      {!open ? (
        <button onClick={loadPreview} disabled={busy} className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
          {busy ? "Loading…" : "Preview what would be deleted"}
        </button>
      ) : preview && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RESET_PREVIEW_ROWS.map(({ key, label }) => (
              <div key={key} className="rounded-xl bg-white px-3 py-2">
                <div className="text-lg font-extrabold text-slate-900">{preview[key]}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <label className="block text-sm text-rose-800">
            Type <code className="rounded bg-white px-1.5 py-0.5 font-mono">{LAUNCH_RESET_CONFIRM_PHRASE}</code> to confirm:
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-xl border border-rose-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200" />
          </label>
          <div className="flex gap-2">
            <button onClick={run} disabled={busy || confirmText !== LAUNCH_RESET_CONFIRM_PHRASE}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
              {busy ? "Deleting…" : "Delete everything above"}
            </button>
            <button onClick={() => { setOpen(false); setPreview(null); setConfirmText(""); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
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

// ── Drug catalogue curation (admin-only; vendors manage price/stock as Listings) ──
const EMPTY_DRUG: CreateDrugInput = { name: "", category: "", requiresPrescription: false };

function PharmacyTab() {
  const fetcher = useCallback(() => api.adminListDrugs({ limit: 50 }).then((r) => r.drugs), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const drugs = data ?? [];
  const [editing, setEditing] = useState<Drug | "new" | null>(null);

  async function remove(d: Drug) {
    if (!confirm(`Remove "${d.name}" from the shared catalogue? This hides it from every vendor.`)) return;
    try { await api.adminDeleteDrug(d.id); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to remove"); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={false}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{drugs.length} drugs in the shared catalogue</p>
        <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add drug
        </button>
      </div>
      {drugs.length === 0 ? (
        <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white"><p className="text-sm text-slate-400">No drugs yet.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Drug</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drugs.map((d: Drug) => (
                <tr key={d.id} className={`hover:bg-slate-50 ${!d.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {d.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                      <span className="font-medium text-slate-800">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.category}</td>
                  <td className="px-4 py-3">{d.requiresPrescription ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">Rx</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">OTC</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(d)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(d)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" title="Remove"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <DrugModal drug={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); }} />}
    </SectionShell>
  );
}

function DrugModal({ drug, onClose, onSaved }: { drug: Drug | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateDrugInput>(drug ? {
    name: drug.name, genericName: drug.genericName ?? undefined, description: drug.description ?? undefined,
    category: drug.category, form: drug.form ?? undefined, strength: drug.strength ?? undefined,
    requiresPrescription: drug.requiresPrescription,
    images: drug.images?.length ? drug.images : drug.imageUrl ? [drug.imageUrl] : [],
  } : { ...EMPTY_DRUG });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof CreateDrugInput>(k: K, v: CreateDrugInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const images = form.images ?? [];

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setErr(null);
    try {
      const urls = await Promise.all(files.map((f) => fileToDataUrl(f)));
      set("images", [...images, ...urls].slice(0, 6));
    } catch { setErr("Could not read one of those images."); }
    e.target.value = "";
  }
  function removeImage(i: number) { set("images", images.filter((_, idx) => idx !== i)); }
  function addUrl(url: string) { if (url.trim()) set("images", [...images, url.trim()].slice(0, 6)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (drug) await api.adminUpdateDrug(drug.id, form);
      else await api.adminCreateDrug(form);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900">{drug ? "Edit drug" : "Add drug"}</h2>
        <p className="mt-1 text-xs text-slate-400">Shared across every vendor. Price and stock are set per-vendor in their own catalogue.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {/* Images (up to 6) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Images (up to 6)</label>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X className="h-3 w-3" />
                  </button>
                  {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-black/50 text-center text-[9px] font-medium text-white">Main</span>}
                </div>
              ))}
              {images.length < 6 && (
                <button type="button" onClick={() => fileRef.current?.click()} className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600">
                  {images.length === 0 ? <ImageIcon className="h-6 w-6" /> : <Upload className="h-5 w-5" />}
                </button>
              )}
            </div>
            <input type="file" accept="image/*" multiple ref={fileRef} onChange={onPickFiles} className="hidden" />
            <input
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }}
              placeholder="…or paste an image URL and press Enter"
              className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Drug name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.genericName ?? ""} onChange={(e) => set("genericName", e.target.value || undefined)} placeholder="Generic name (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input required value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Category e.g. Pain Relief" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={form.form ?? ""} onChange={(e) => set("form", e.target.value || undefined)} placeholder="Form e.g. tablet (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input value={form.strength ?? ""} onChange={(e) => set("strength", e.target.value || undefined)} placeholder="Strength e.g. 500mg (optional)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value || undefined)} placeholder="Description (optional)" rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.requiresPrescription ?? false} onChange={(e) => set("requiresPrescription", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" />
            Requires prescription (Rx)
          </label>
          {err && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{busy ? "Saving…" : drug ? "Save changes" : "Add drug"}</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Orders oversight (read-only — fulfilment is advanced per-vendor in the vendor dashboard) ──
const ORDER_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", awaiting_verification: "bg-orange-100 text-orange-700",
  paid: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700",
  dispatched: "bg-violet-100 text-violet-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
};

function OrdersTab() {
  const fetcher = useCallback(() => api.adminListOrders({ limit: 50 }).then((r) => r.orders), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const orders = data ?? [];

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={orders.length === 0} emptyText="No orders yet.">
      <div className="space-y-3">
        {orders.map((o: Order) => {
          const itemCount = o.vendorOrders.reduce((n, vo) => n + vo.items.reduce((m, i) => m + i.qty, 0), 0);
          return (
            <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">Order #{o.id.slice(0, 8).toUpperCase()}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{o.patient.fullName} · {when(o.createdAt)}</div>
                  <div className="mt-1 text-sm text-slate-600">{itemCount} item(s) across {o.vendorOrders.length} vendor(s) · <span className="font-semibold text-slate-800">{kes(o.totalKes)}</span></div>
                  <div className="mt-0.5 text-xs text-slate-400">{o.deliveryAddress}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${o.payment?.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {o.payment?.status ?? "unpaid"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {o.vendorOrders.map((vo) => (
                  <div key={vo.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{vo.organization.name} · {vo.items.reduce((n, i) => n + i.qty, 0)} item(s)</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ORDER_STATUS_CLS[vo.status] ?? "bg-slate-100 text-slate-600"}`}>{vo.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ── Support inbox ────────────────────────────────────────────────────────── */
const SUPPORT_STATUS_STYLE: Record<string, string> = {
  open: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  awaiting_client: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
};

function SupportTab() {
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const fetcher = useCallback(
    () => api.adminListSupportTickets({ limit: 100, ...(filter === "all" ? {} : { status: filter }) }),
    [filter],
  );
  const { data, loading, error, reload } = useSection(fetcher);
  const tickets = data?.tickets ?? [];
  const [openId, setOpenId] = useState<string | null>(null);

  const FILTERS: (SupportStatus | "all")[] = ["all", "open", "in_progress", "awaiting_client", "resolved", "closed"];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "all" ? "All" : SUPPORT_STATUS_LABELS[f]}
            {f === "all" && data?.openCount ? (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">{data.openCount} open</span>
            ) : null}
          </button>
        ))}
      </div>

      <SectionShell
        loading={loading}
        error={error}
        onRetry={reload}
        empty={tickets.length === 0}
        emptyText="No messages here."
      >
        <div className="space-y-2">
          {tickets.map((t: SupportTicket) => (
            <AdminTicket
              key={t.id}
              ticket={t}
              open={openId === t.id}
              onToggle={() => setOpenId(openId === t.id ? null : t.id)}
              onChanged={reload}
            />
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function AdminTicket({
  ticket, open, onToggle, onChanged,
}: {
  ticket: SupportTicket;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.replySupportTicket(ticket.id, { body: reply.trim() });
      setReply("");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: SupportStatus) {
    setBusy(true);
    try {
      await api.adminPatchSupportTicket(ticket.id, { status });
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  const unanswered = !ticket.messages[ticket.messages.length - 1]?.fromStaff;

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white ${unanswered ? "border-teal-300" : "border-slate-200"}`}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">{ticket.subject}</span>
            {unanswered && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-700">Needs reply</span>}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {SUPPORT_CATEGORY_LABELS[ticket.category]}
            {ticket.documentType ? ` · ${SUPPORT_DOCUMENT_LABELS[ticket.documentType]}` : ""}
            {" · "}{ticket.contactName}
            {!ticket.userId && <span className="text-slate-400"> (no account)</span>}
            {" · "}{when(ticket.lastReplyAt)}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${SUPPORT_STATUS_STYLE[ticket.status] ?? "bg-slate-100 text-slate-600"}`}>
          {SUPPORT_STATUS_LABELS[ticket.status]}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <a href={`mailto:${ticket.contactEmail}`} className="hover:text-teal-700">{ticket.contactEmail}</a>
            {ticket.contactPhone && <a href={`tel:${ticket.contactPhone}`} className="hover:text-teal-700">{ticket.contactPhone}</a>}
            <span className="font-mono">Ref {ticket.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <ul className="space-y-3">
            {ticket.messages.map((m) => (
              <li key={m.id} className={`flex ${m.fromStaff ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.fromStaff ? "rounded-tr-sm bg-teal-600 text-white" : "rounded-tl-sm bg-white text-slate-700 ring-1 ring-slate-200"
                }`}>
                  <div className={`mb-0.5 text-[11px] font-semibold ${m.fromStaff ? "text-teal-50" : "text-slate-500"}`}>
                    {m.fromStaff ? (m.sender?.fullName ?? "Care Bora") : ticket.contactName}
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className={`mt-1 text-[10px] ${m.fromStaff ? "text-teal-100" : "text-slate-400"}`}>{when(m.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>

          {ticket.status !== "closed" && (
            <form onSubmit={send} className="mt-4 flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Reply to the client…"
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                disabled={busy || !reply.trim()}
                aria-label="Send reply"
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {(["in_progress", "resolved", "closed", "open"] as SupportStatus[])
              .filter((s) => s !== ticket.status)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Mark {SUPPORT_STATUS_LABELS[s].toLowerCase()}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

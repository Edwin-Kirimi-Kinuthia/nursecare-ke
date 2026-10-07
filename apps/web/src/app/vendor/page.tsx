"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, MapPin, Users, Plus, BadgeCheck, Ban, X, Pill, ShoppingBag, Search, Pencil,
  Siren, Truck, Phone, Clock, FlaskConical, ClipboardList,
} from "lucide-react";
import {
  ApiError, KENYA_COUNTIES, type CreateBranchInput, type InviteMemberInput,
  type CreateListingInput, type PatchListingInput, type PatchVendorOrderInput,
  type CreateAmbulanceInput, type PatchAmbulanceInput, type AcceptAmbulanceRequestInput,
  type PatchAmbulanceRequestInput, type CreateLabTestInput, type PatchLabOrderInput,
  type EnterLabResultInput,
} from "@carebora/shared";
import type {
  OrganizationDetail, OrgBranch, Listing, Drug, VendorOrder, Ambulance, AmbulanceRequest,
  LabTest, LabOrder, LabOrderItem,
} from "@carebora/api-client";
import { api, kes, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PhoneField } from "@/components/PhoneField";
import { useSection, SectionShell } from "@/components/dashboard/section";
import { useLocation } from "@/components/LocationProvider";

type Tab = "overview" | "branches" | "team" | "catalogue" | "orders" | "dispatch" | "fleet" | "labtests" | "laborders";

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_review: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700",
  suspended: "bg-rose-100 text-rose-700",
  rejected: "bg-rose-100 text-rose-700",
};

export default function VendorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "vendor") { router.push("/"); return; }
  }, [user, authLoading, router]);

  const fetcher = useCallback(() => api.getVendorOrg(), []);
  const { data: org, loading, error, reload } = useSection(fetcher);

  if (authLoading || !user || user.role !== "vendor") {
    return <div className="mx-auto max-w-6xl px-4 py-16"><div className="h-40 rounded-2xl skeleton" /></div>;
  }

  const TABS: { id: Tab; label: string; Icon: typeof Building2 }[] = [
    { id: "overview", label: "Overview", Icon: Building2 },
    { id: "branches", label: "Branches", Icon: MapPin },
    { id: "team", label: "Team", Icon: Users },
    ...(org?.type === "pharmacy" ? [
      { id: "catalogue" as Tab, label: "Catalogue", Icon: Pill },
      { id: "orders" as Tab, label: "Orders", Icon: ShoppingBag },
    ] : []),
    ...(org?.type === "ambulance" ? [
      { id: "dispatch" as Tab, label: "Dispatch", Icon: Siren },
      { id: "fleet" as Tab, label: "Fleet", Icon: Truck },
    ] : []),
    ...(org?.type === "lab" ? [
      { id: "labtests" as Tab, label: "Tests", Icon: FlaskConical },
      { id: "laborders" as Tab, label: "Lab orders", Icon: ClipboardList },
    ] : []),
  ];

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-600">
            <Building2 className="h-4 w-4" /> Vendor dashboard
          </div>
          {org && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{org.name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_CLS[org.status] ?? ""}`}>
                {org.status.replace("_", " ")}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">{org.type}</span>
            </div>
          )}
          {org?.status === "pending" && (
            <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              Your business is awaiting admin review. You can still set up branches and team while you wait.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                tab === id ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <SectionShell loading={loading} error={error} onRetry={reload} empty={!org} emptyText="No organization found.">
            {org && (
              <>
                {tab === "overview" && <OverviewTab org={org} onSaved={reload} />}
                {tab === "branches" && <BranchesTab branches={org.branches} onChanged={reload} />}
                {tab === "team" && <TeamTab members={org.members} onChanged={reload} />}
                {tab === "catalogue" && org.type === "pharmacy" && <CatalogueTab />}
                {tab === "orders" && org.type === "pharmacy" && <VendorOrdersTab />}
                {tab === "dispatch" && org.type === "ambulance" && <DispatchTab />}
                {tab === "fleet" && org.type === "ambulance" && <FleetTab />}
                {tab === "labtests" && org.type === "lab" && <LabTestsTab />}
                {tab === "laborders" && org.type === "lab" && <LabOrdersTab />}
              </>
            )}
          </SectionShell>
        </div>
      </section>
    </div>
  );
}

function OverviewTab({ org, onSaved }: { org: OrganizationDetail; onSaved: () => void }) {
  const [description, setDescription] = useState(org.description ?? "");
  const [contactPhone, setContactPhone] = useState(org.contactPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.patchVendorOrg({ description: description || undefined, contactPhone: contactPhone || undefined });
      onSaved();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Business details</h3>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <PhoneField label="Contact phone" value={contactPhone} onChange={setContactPhone} />
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Licence & payouts</h3>
        <dl className="space-y-2 text-sm">
          <Row label="Licence number" value={org.licenceNumber ?? "—"} />
          <Row label="Licence body" value={org.licenceBody ?? "—"} />
          <Row label="Commission rate" value={org.commissionPercent != null ? `${org.commissionPercent}%` : "Platform default"} />
          <Row label="Payout method" value={org.payoutMethod ?? "Not set up yet"} />
        </dl>
        {org.reviewNotes && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <BadgeCheck className="mr-1 inline h-3.5 w-3.5" /> Admin note: {org.reviewNotes}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

const EMPTY_BRANCH: CreateBranchInput = {
  name: "", county: "Nairobi", latitude: -1.286389, longitude: 36.817223,
  deliveryRadiusKm: 10, deliveryFeeKes: 0, minOrderKes: 0, isOpen24h: false,
};

function BranchesTab({ branches, onChanged }: { branches: OrgBranch[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_BRANCH);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof CreateBranchInput>(k: K, v: CreateBranchInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.createVendorBranch(form);
      setAdding(false); setForm(EMPTY_BRANCH); onChanged();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to add branch"); }
    finally { setBusy(false); }
  }

  async function toggleActive(b: OrgBranch) {
    try { await api.patchVendorBranch(b.id, { isActive: !b.isActive }); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{branches.length} branch(es)</p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add branch
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {branches.map((b) => (
          <div key={b.id} className={`rounded-2xl border border-slate-200 bg-white p-5 ${!b.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-slate-900">{b.name}</div>
                <div className="text-sm text-slate-500">{b.town ? `${b.town}, ` : ""}{b.county}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Radius {b.deliveryRadiusKm}km · Fee KES {b.deliveryFeeKes} · Min order KES {b.minOrderKes}
                </div>
              </div>
              <button onClick={() => toggleActive(b)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${b.isActive ? "border border-rose-200 text-rose-600 hover:bg-rose-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                {b.isActive ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add branch</h2>
              <button onClick={() => setAdding(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={add} className="mt-4 space-y-3">
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Branch name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <select value={form.county} onChange={(e) => set("county", e.target.value as CreateBranchInput["county"])}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", Number(e.target.value))} placeholder="Latitude"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <input required type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", Number(e.target.value))} placeholder="Longitude"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                  {busy ? "Adding…" : "Add branch"}
                </button>
                <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamTab({ members, onChanged }: { members: { id: string; role: string; user: { fullName: string; email: string } }[]; onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteMemberInput["role"]>("staff");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.inviteVendorMember({ email, role });
      setEmail(""); onChanged();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to invite"); }
    finally { setBusy(false); }
  }

  async function remove(memberId: string) {
    if (!confirm("Remove this team member?")) return;
    try { await api.removeVendorMember(memberId); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to remove"); }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Team</h3>
        <div className="mt-3 space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-800">{m.user.fullName}</div>
                <div className="text-xs text-slate-400">{m.user.email} · <span className="capitalize">{m.role}</span></div>
              </div>
              {m.role !== "owner" && (
                <button onClick={() => remove(m.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"><Ban className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={invite} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-900">Invite a teammate</h3>
        <p className="text-xs text-slate-400">They must already have a CareBora account.</p>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <select value={role} onChange={(e) => setRole(e.target.value as InviteMemberInput["role"])}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {busy ? "Inviting…" : "Invite"}
        </button>
      </form>
    </div>
  );
}

// ── Catalogue (listings) ─────────────────────────────────────────────────────
function CatalogueTab() {
  const fetcher = useCallback(() => api.listVendorListings().then((r) => r.listings), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const listings = data ?? [];
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);

  async function toggleActive(l: Listing) {
    try { await api.patchVendorListing(l.id, { isActive: !l.isActive }); reload(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{listings.length} listing(s)</p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add listing
        </button>
      </div>
      <SectionShell loading={loading} error={error} onRetry={reload} empty={listings.length === 0} emptyText="No listings yet — add your first drug.">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Drug</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((l) => (
                <tr key={l.id} className={`hover:bg-slate-50 ${!l.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{l.drug.name}</td>
                  <td className="px-4 py-3 text-slate-700">{kes(l.priceKes)}</td>
                  <td className="px-4 py-3"><span className={`font-medium ${l.stockQty === 0 ? "text-rose-600" : l.stockQty < 20 ? "text-amber-600" : "text-slate-700"}`}>{l.stockQty}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(l)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => toggleActive(l)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${l.isActive ? "border border-rose-200 text-rose-600 hover:bg-rose-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                        {l.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionShell>
      {adding && <ListingModal onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await reload(); }} />}
      {editing && <ListingModal listing={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); }} />}
    </div>
  );
}

function ListingModal({ listing, onClose, onSaved }: { listing?: Listing; onClose: () => void; onSaved: () => void }) {
  const [drugQuery, setDrugQuery] = useState("");
  const [results, setResults] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(listing?.drug ?? null);
  const [newDrugName, setNewDrugName] = useState("");
  const [newDrugCategory, setNewDrugCategory] = useState("");
  const [priceKes, setPriceKes] = useState(listing?.priceKes ?? 0);
  const [stockQty, setStockQty] = useState(listing?.stockQty ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!drugQuery.trim() || listing) { queueMicrotask(() => setResults([])); return; }
    const t = setTimeout(() => {
      api.browseCatalogue({ search: drugQuery, limit: 8 }).then((r) => setResults(r.drugs)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [drugQuery, listing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (listing) {
        const input: PatchListingInput = { priceKes, stockQty };
        await api.patchVendorListing(listing.id, input);
      } else {
        const input: CreateListingInput = selectedDrug
          ? { drugId: selectedDrug.id, priceKes, stockQty }
          : { drug: { name: newDrugName, category: newDrugCategory, requiresPrescription: false }, priceKes, stockQty };
        await api.createVendorListing(input);
      }
      onSaved();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  const canSubmit = (listing || selectedDrug || (newDrugName.trim() && newDrugCategory.trim())) && priceKes > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{listing ? "Edit listing" : "Add listing"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {!listing && !selectedDrug && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Find a drug in the shared catalogue</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)} placeholder="Search…"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              {results.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
                  {results.map((d) => (
                    <button key={d.id} type="button" onClick={() => setSelectedDrug(d)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      {d.name} <span className="text-xs text-slate-400">· {d.category}</span>
                    </button>
                  ))}
                </div>
              )}
              {drugQuery.trim() && results.length === 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
                  <p className="text-xs text-slate-500">Not found — add it to the shared catalogue:</p>
                  <input value={newDrugName} onChange={(e) => setNewDrugName(e.target.value)} placeholder="Drug name"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <input value={newDrugCategory} onChange={(e) => setNewDrugCategory(e.target.value)} placeholder="Category"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
            </div>
          )}
          {(listing || selectedDrug) && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{listing?.drug.name ?? selectedDrug?.name}</span>
              {!listing && <button type="button" onClick={() => setSelectedDrug(null)} className="text-xs text-slate-400 hover:text-rose-500">Change</button>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Price (KES)</label>
              <input required type="number" min="1" value={priceKes || ""} onChange={(e) => setPriceKes(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Stock</label>
              <input required type="number" min="0" value={stockQty} onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy || !canSubmit} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Order fulfilment ─────────────────────────────────────────────────────────
const VENDOR_ORDER_STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", awaiting_verification: "bg-orange-100 text-orange-700",
  paid: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700",
  dispatched: "bg-violet-100 text-violet-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
};
const VENDOR_NEXT_STATUS: Record<string, "processing" | "dispatched" | "delivered" | undefined> = {
  paid: "processing", processing: "dispatched", dispatched: "delivered",
};

function VendorOrdersTab() {
  const fetcher = useCallback(() => api.listVendorOrders({ limit: 50 }).then((r) => r.vendorOrders), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const orders = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);

  async function advance(vo: VendorOrder) {
    const next = VENDOR_NEXT_STATUS[vo.status];
    if (!next) return;
    setBusyId(vo.id);
    try {
      const input: PatchVendorOrderInput = { status: next };
      await api.patchVendorOrder(vo.id, input);
      await reload();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={orders.length === 0} emptyText="No orders yet.">
      <div className="space-y-3">
        {orders.map((vo) => (
          <div key={vo.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">Order #{vo.id.slice(0, 8).toUpperCase()}</div>
                <div className="mt-0.5 text-xs text-slate-400">{vo.order?.patient.fullName} · {when(vo.createdAt)}</div>
                <div className="mt-1 text-sm text-slate-600">{vo.items.length} item(s) · <span className="font-semibold text-slate-800">{kes(vo.subtotalKes)}</span></div>
                <div className="mt-0.5 text-xs text-slate-400">{vo.order?.deliveryAddress}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${VENDOR_ORDER_STATUS_CLS[vo.status] ?? "bg-slate-100 text-slate-600"}`}>{vo.status.replace("_", " ")}</span>
                {VENDOR_NEXT_STATUS[vo.status] && (
                  <button onClick={() => advance(vo)} disabled={busyId === vo.id}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                    Mark {VENDOR_NEXT_STATUS[vo.status]}
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

// ── Ambulance dispatch ───────────────────────────────────────────────────────
const AMBULANCE_STATUS_CLS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700", accepted: "bg-indigo-100 text-indigo-700",
  dispatched: "bg-blue-100 text-blue-700", en_route_pickup: "bg-violet-100 text-violet-700",
  arrived_pickup: "bg-teal-100 text-teal-700", en_route_destination: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
};
const AMBULANCE_NEXT_STATUS: Record<string, PatchAmbulanceRequestInput["status"]> = {
  dispatched: "en_route_pickup", en_route_pickup: "arrived_pickup",
  arrived_pickup: "en_route_destination", en_route_destination: "completed",
};

function DispatchTab() {
  const { lat, lng, requestPreciseLocation, loading: locating } = useLocation();
  const fetcher = useCallback(() => api.vendorAmbulanceQueue(lat != null && lng != null ? { lat, lng } : {}), [lat, lng]);
  const { data, loading, error, reload } = useSection(fetcher);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState<Record<string, string>>({});

  async function accept(r: AmbulanceRequest) {
    setBusyId(r.id);
    try {
      const input: AcceptAmbulanceRequestInput = {};
      await api.acceptAmbulanceRequest(r.id, input);
      await reload();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Failed to accept — it may already be taken."); }
    finally { setBusyId(null); }
  }

  async function advance(r: AmbulanceRequest) {
    const next = AMBULANCE_NEXT_STATUS[r.status];
    if (!next) return;
    setBusyId(r.id);
    try {
      const input: PatchAmbulanceRequestInput = { status: next };
      if (next === "completed") {
        const fee = parseInt(feeInput[r.id] ?? "", 10);
        if (!fee || fee <= 0) { alert("Enter a fee before marking completed."); setBusyId(null); return; }
        input.feeKes = fee;
      }
      await api.patchVendorAmbulanceRequest(r.id, input);
      await reload();
    } catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  const own = data?.own ?? [];
  const unassigned = data?.unassigned ?? [];

  return (
    <div>
      <button onClick={requestPreciseLocation} disabled={locating}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
        {lat != null ? "Location set — showing nearby requests" : "Share your base location to see nearby requests"}
      </button>
      <SectionShell loading={loading} error={error} onRetry={reload} empty={own.length === 0 && unassigned.length === 0} emptyText="No requests right now.">
        {unassigned.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-bold text-slate-900">Nearby requests</h3>
            <div className="space-y-3">
              {unassigned.map((r) => (
                <div key={r.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold capitalize text-slate-900">{r.type.replace(/_/g, " ")} · {r.urgency}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5" /> {r.pickupAddress}, {r.pickupCounty}</div>
                      <p className="mt-1 text-sm text-slate-600">{r.patientCondition}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" /> {r.contactPhone} · <Clock className="h-3 w-3" /> {when(r.createdAt)}</div>
                    </div>
                    <button onClick={() => accept(r)} disabled={busyId === r.id}
                      className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">Your active requests</h3>
          {own.length === 0 ? (
            <p className="text-sm text-slate-400">None yet.</p>
          ) : (
            <div className="space-y-3">
              {own.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold capitalize text-slate-900">{r.type.replace(/_/g, " ")} · {r.urgency}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{r.patient.fullName} · {when(r.createdAt)}</div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5" /> {r.pickupAddress}, {r.pickupCounty}</div>
                      {r.destinationName && <div className="mt-0.5 text-sm text-slate-500">→ {r.destinationName}</div>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${AMBULANCE_STATUS_CLS[r.status] ?? ""}`}>{r.status.replace(/_/g, " ")}</span>
                  </div>
                  {r.status === "accepted" && (
                    <button onClick={() => { setBusyId(r.id); api.patchVendorAmbulanceRequest(r.id, { status: "dispatched" }).then(reload).catch((e) => alert(e instanceof ApiError ? e.message : "Failed")).finally(() => setBusyId(null)); }}
                      disabled={busyId === r.id}
                      className="mt-3 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                      Mark dispatched
                    </button>
                  )}
                  {AMBULANCE_NEXT_STATUS[r.status] && r.status !== "accepted" && (
                    <div className="mt-3 flex items-center gap-2">
                      {r.status === "en_route_destination" && (
                        <input type="number" min="1" placeholder="Fee (KES)" value={feeInput[r.id] ?? ""} onChange={(e) => setFeeInput((f) => ({ ...f, [r.id]: e.target.value }))}
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      )}
                      <button onClick={() => advance(r)} disabled={busyId === r.id}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                        Mark {AMBULANCE_NEXT_STATUS[r.status]?.replace(/_/g, " ")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function FleetTab() {
  const fetcher = useCallback(() => api.listVendorAmbulances().then((r) => r.ambulances), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const ambulances = data ?? [];
  const [adding, setAdding] = useState(false);
  const [plateNumber, setPlateNumber] = useState("");
  const [type, setType] = useState<CreateAmbulanceInput["type"]>("basic");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.createVendorAmbulance({ plateNumber, type, crewSize: 2 });
      setPlateNumber(""); setAdding(false); await reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to add"); }
    finally { setBusy(false); }
  }

  async function toggleAvailable(a: Ambulance) {
    const input: PatchAmbulanceInput = { isAvailable: !a.isAvailable };
    try { await api.patchVendorAmbulance(a.id, input); await reload(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{ambulances.length} vehicle(s)</p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add vehicle
        </button>
      </div>
      <SectionShell loading={loading} error={error} onRetry={reload} empty={ambulances.length === 0} emptyText="No vehicles yet.">
        <div className="grid gap-3 sm:grid-cols-2">
          {ambulances.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900">{a.plateNumber}</div>
                  <div className="text-sm capitalize text-slate-500">{a.type.replace(/_/g, " ")} · crew of {a.crewSize}</div>
                </div>
                <button onClick={() => toggleAvailable(a)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${a.isAvailable ? "bg-emerald-100 text-emerald-700" : "border border-slate-200 text-slate-500"}`}>
                  {a.isAvailable ? "Available" : "Unavailable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add vehicle</h2>
              <button onClick={() => setAdding(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={add} className="mt-4 space-y-3">
              <input required value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="Plate number"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <select value={type} onChange={(e) => setType(e.target.value as CreateAmbulanceInput["type"])}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="basic">Basic</option>
                <option value="advanced_life_support">Advanced Life Support</option>
                <option value="icu">ICU</option>
                <option value="neonatal">Neonatal</option>
                <option value="mortuary">Mortuary</option>
              </select>
              {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                  {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lab test menu ─────────────────────────────────────────────────────────────
function LabTestsTab() {
  const fetcher = useCallback(() => api.listVendorLabTests().then((r) => r.tests), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const tests = data ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CreateLabTestInput>({ name: "", category: "", priceKes: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.createVendorLabTest(form);
      setForm({ name: "", category: "", priceKes: 0 }); setAdding(false); await reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to add"); }
    finally { setBusy(false); }
  }

  async function toggleActive(t: LabTest) {
    try { await api.patchVendorLabTest(t.id, { isActive: !t.isActive }); await reload(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{tests.length} test(s)</p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Add test
        </button>
      </div>
      <SectionShell loading={loading} error={error} onRetry={reload} empty={tests.length === 0} emptyText="No tests yet.">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Test</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((t) => (
                <tr key={t.id} className={`hover:bg-slate-50 ${!t.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500">{t.category}</td>
                  <td className="px-4 py-3 text-slate-700">{kes(t.priceKes)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActive(t)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${t.isActive ? "border border-rose-200 text-rose-600 hover:bg-rose-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                      {t.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionShell>
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add test</h2>
              <button onClick={() => setAdding(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={add} className="mt-4 space-y-3">
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Test name (e.g. Full Blood Count)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <input required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              <input required type="number" min="1" value={form.priceKes || ""} onChange={(e) => setForm((f) => ({ ...f, priceKes: parseInt(e.target.value, 10) || 0 }))} placeholder="Price (KES)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                  {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lab order fulfilment ────────────────────────────────────────────────────
const LAB_ORDER_STATUS_CLS: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700", accepted: "bg-indigo-100 text-indigo-700",
  sample_collected: "bg-blue-100 text-blue-700", processing: "bg-violet-100 text-violet-700",
  resulted: "bg-emerald-100 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
};
const LAB_NEXT_STATUS: Record<string, PatchLabOrderInput["status"]> = {
  requested: "accepted", accepted: "sample_collected", sample_collected: "processing",
};

function LabOrdersTab() {
  const fetcher = useCallback(() => api.listVendorLabOrders({ limit: 50 }).then((r) => r.orders), []);
  const { data, loading, error, reload } = useSection(fetcher);
  const orders = data ?? [];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resulting, setResulting] = useState<LabOrderItem | null>(null);

  async function advance(o: LabOrder) {
    const next = LAB_NEXT_STATUS[o.status];
    if (!next) return;
    setBusyId(o.id);
    try { await api.patchVendorLabOrder(o.id, { status: next }); await reload(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to update"); }
    finally { setBusyId(null); }
  }

  return (
    <SectionShell loading={loading} error={error} onRetry={reload} empty={orders.length === 0} emptyText="No lab orders yet.">
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{o.patient.fullName}</div>
                <div className="mt-0.5 text-xs text-slate-400">{when(o.createdAt)} · {kes(o.totalKes)}</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex items-center gap-2">
                      {i.testName}
                      {!i.result && ["sample_collected", "processing"].includes(o.status) && (
                        <button onClick={() => setResulting(i)} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-100">Enter result</button>
                      )}
                      {i.result && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{i.result.value}{i.result.unit ? ` ${i.result.unit}` : ""}</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${LAB_ORDER_STATUS_CLS[o.status] ?? ""}`}>{o.status.replace("_", " ")}</span>
                {LAB_NEXT_STATUS[o.status] && (
                  <button onClick={() => advance(o)} disabled={busyId === o.id}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                    Mark {LAB_NEXT_STATUS[o.status]?.replace("_", " ")}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {resulting && <ResultModal item={resulting} onClose={() => setResulting(null)} onSaved={async () => { setResulting(null); await reload(); }} />}
    </SectionShell>
  );
}

function ResultModal({ item, onClose, onSaved }: { item: LabOrderItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EnterLabResultInput>({ value: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await api.enterLabResult(item.id, form); onSaved(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Enter result — {item.testName}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="Value"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input value={form.unit ?? ""} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value || undefined }))} placeholder="Unit"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <input value={form.referenceRange ?? ""} onChange={(e) => setForm((f) => ({ ...f, referenceRange: e.target.value || undefined }))} placeholder="Reference range (optional)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select value={form.flag ?? ""} onChange={(e) => setForm((f) => ({ ...f, flag: (e.target.value || undefined) as EnterLabResultInput["flag"] }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">No flag</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
          </select>
          {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy ? "Saving…" : "Save result"}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

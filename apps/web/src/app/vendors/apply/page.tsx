"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Loader2, LocateFixed } from "lucide-react";
import { ApiError, KENYA_COUNTIES, type VendorApplicationInput } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { NameFields, EMPTY_NAME, composeFullName, type NameParts } from "@/components/NameFields";

const ORG_TYPES = [
  { value: "pharmacy", label: "Pharmacy" },
  { value: "ambulance", label: "Ambulance operator" },
  { value: "lab", label: "Diagnostic lab" },
] as const;

const EMPTY: VendorApplicationInput = {
  fullName: "", email: "", phone: undefined, password: "",
  orgType: "pharmacy", orgName: "", description: undefined,
  licenceNumber: "", licenceBody: undefined, kraPin: undefined,
  contactEmail: undefined, contactPhone: undefined,
  branch: {
    name: "", county: "Nairobi", town: undefined, addressLine: undefined, phone: undefined,
    latitude: -1.286389, longitude: 36.817223,
    deliveryRadiusKm: 10, deliveryFeeKes: 0, minOrderKes: 0,
    opensMinute: undefined, closesMinute: undefined, isOpen24h: false,
  },
};

export default function VendorApplyPage() {
  const { refresh } = useAuth();
  const [form, setForm] = useState<VendorApplicationInput>(EMPTY);
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = <K extends keyof VendorApplicationInput>(k: K, v: VendorApplicationInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setBranch = <K extends keyof VendorApplicationInput["branch"]>(k: K, v: VendorApplicationInput["branch"][K]) =>
    setForm((f) => ({ ...f, branch: { ...f.branch, [k]: v } }));

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBranch("latitude", pos.coords.latitude);
        setBranch("longitude", pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await api.applyAsVendor({ ...form, fullName: composeFullName(name) });
      await refresh();
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your application");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Application submitted</h1>
        <p className="mt-2 text-slate-500">
          Thanks for applying to sell on CareBora. Our team will review your licence and get back to you.
          Your business is <strong>pending review</strong> and won&apos;t appear to buyers until approved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/vendor" className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Go to my dashboard</Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg">
          <Building2 className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sell on CareBora</h1>
          <p className="text-sm text-slate-500">Register your pharmacy, ambulance service, or lab as a vendor.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <NameFields value={name} onChange={setName} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Business type</label>
          <select value={form.orgType} onChange={(e) => set("orgType", e.target.value as VendorApplicationInput["orgType"])}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" type="email" required value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Phone (optional)" value={form.phone ?? ""} onChange={(v) => set("phone", v || undefined)} placeholder="0712345678" />
        </div>
        <Field label="Password" type="password" required value={form.password} onChange={(v) => set("password", v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name" required value={form.orgName} onChange={(v) => set("orgName", v)} placeholder="e.g. Wellcare Pharmacy" />
          <Field label="Licence number" required value={form.licenceNumber} onChange={(v) => set("licenceNumber", v)} placeholder="e.g. PPB-2020-1123" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Licence body (optional)" value={form.licenceBody ?? ""} onChange={(v) => set("licenceBody", v || undefined)} placeholder="e.g. PPB" />
          <Field label="KRA PIN (optional)" value={form.kraPin ?? ""} onChange={(v) => set("kraPin", v || undefined)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description (optional)</label>
          <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value || undefined)} rows={2}
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="text-sm font-bold text-slate-900">First branch / location</h2>
          <p className="text-xs text-slate-400">Buyers near this location will see you first.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Branch name" required value={form.branch.name} onChange={(v) => setBranch("name", v)} placeholder="e.g. CBD Branch" />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">County</label>
              <select value={form.branch.county} onChange={(e) => setBranch("county", e.target.value as VendorApplicationInput["branch"]["county"])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
                {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Town (optional)" value={form.branch.town ?? ""} onChange={(v) => setBranch("town", v || undefined)} />
            <Field label="Address line (optional)" value={form.branch.addressLine ?? ""} onChange={(v) => setBranch("addressLine", v || undefined)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Latitude" type="number" required value={String(form.branch.latitude)} onChange={(v) => setBranch("latitude", Number(v))} />
            <Field label="Longitude" type="number" required value={String(form.branch.longitude)} onChange={(v) => setBranch("longitude", Number(v))} />
            <div className="flex items-end">
              <button type="button" onClick={useMyLocation} disabled={locating}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Use my location
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Delivery radius (km)" type="number" value={String(form.branch.deliveryRadiusKm)} onChange={(v) => setBranch("deliveryRadiusKm", Number(v) || 10)} />
            <Field label="Delivery fee (KES)" type="number" value={String(form.branch.deliveryFeeKes)} onChange={(v) => setBranch("deliveryFeeKes", Number(v) || 0)} />
            <Field label="Min. order (KES)" type="number" value={String(form.branch.minOrderKes)} onChange={(v) => setBranch("minOrderKes", Number(v) || 0)} />
          </div>
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <button type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
        </button>
        <p className="text-center text-xs text-slate-400">
          Your details go to our verification team. You&apos;ll appear to buyers only once approved.
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Looking for care instead? <Link href="/login" className="font-semibold text-teal-700 hover:underline">Sign up as a patient</Link>
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Stethoscope, CheckCircle2, Loader2, Upload, FileCheck2, User as UserIcon } from "lucide-react";
import { ApiError, type ProviderApplicationInput } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { fileToDataUrl } from "@/lib/files";
import { NameFields, EMPTY_NAME, composeFullName, type NameParts } from "@/components/NameFields";

const ROLES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "physio", label: "Physiotherapist" },
  { value: "pharmacy", label: "Pharmacy" },
] as const;

export default function ProviderApplyPage() {
  const { refresh } = useAuth();
  const [form, setForm] = useState<ProviderApplicationInput>({
    fullName: "", email: "", phone: undefined, password: "",
    role: "doctor", specialty: "", licenceNumber: "", licenceBody: undefined,
    yearsExperience: undefined, qualifications: undefined,
    avatarUrl: "", licenceDocumentUrl: "",
  });
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [licenceFileName, setLicenceFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const licenceInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProviderApplicationInput>(k: K, v: ProviderApplicationInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onPickAvatar(file: File | undefined) {
    if (!file) return;
    try { set("avatarUrl", await fileToDataUrl(file, 480)); }
    catch { setError("Could not read that photo — try a different file."); }
  }

  async function onPickLicence(file: File | undefined) {
    if (!file) return;
    try { set("licenceDocumentUrl", await fileToDataUrl(file, 1600)); setLicenceFileName(file.name); }
    catch { setError("Could not read that file — try a different one."); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.avatarUrl) { setError("Please add a passport photo."); return; }
    if (!form.licenceDocumentUrl) { setError("Please upload your practice licence."); return; }
    setBusy(true);
    try {
      await api.applyAsProvider({ ...form, fullName: composeFullName(name) });
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
          Thanks for applying to Care Bora. Our team will review your licence and get back to you.
          Your profile is <strong>pending verification</strong> and won&apos;t be publicly listed until approved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/profile" className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Go to my profile</Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg">
          <Stethoscope className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Join as a healthcare provider</h1>
          <p className="text-sm text-slate-500">Apply to offer consultations, home visits, and care on Care Bora.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <NameFields value={name} onChange={setName} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Profession</label>
          <select value={form.role} onChange={(e) => set("role", e.target.value as ProviderApplicationInput["role"])}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" type="email" required value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Phone (optional)" value={form.phone ?? ""} onChange={(v) => set("phone", v || undefined)} placeholder="0712345678" />
        </div>
        <Field label="Password" type="password" required value={form.password} onChange={(v) => set("password", v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Specialty" required value={form.specialty} onChange={(v) => set("specialty", v)} placeholder="e.g. General Practice" />
          <Field label="Years of experience" type="number" value={form.yearsExperience?.toString() ?? ""} onChange={(v) => set("yearsExperience", v ? Number(v) : undefined)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Licence number" required value={form.licenceNumber} onChange={(v) => set("licenceNumber", v)} placeholder="e.g. MD-2015-001" />
          <Field label="Licence body (optional)" value={form.licenceBody ?? ""} onChange={(v) => set("licenceBody", v || undefined)} placeholder="e.g. KMPDC" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Qualifications (optional)</label>
          <textarea value={form.qualifications ?? ""} onChange={(e) => set("qualifications", e.target.value || undefined)} rows={2}
            placeholder="One per line, or comma-separated — e.g. MBChB – University of Nairobi"
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Passport photo</label>
            <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
            <button type="button" onClick={() => avatarInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-left text-sm transition hover:border-teal-400 hover:bg-teal-50/50">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><UserIcon className="h-4 w-4" /></span>
              )}
              <span className={form.avatarUrl ? "font-medium text-teal-700" : "text-slate-500"}>
                {form.avatarUrl ? "Photo selected — change" : "Upload a photo"}
              </span>
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Practice licence</label>
            <input ref={licenceInput} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onPickLicence(e.target.files?.[0])} />
            <button type="button" onClick={() => licenceInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-left text-sm transition hover:border-teal-400 hover:bg-teal-50/50">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                {form.licenceDocumentUrl ? <FileCheck2 className="h-4 w-4 text-teal-600" /> : <Upload className="h-4 w-4" />}
              </span>
              <span className={`truncate ${form.licenceDocumentUrl ? "font-medium text-teal-700" : "text-slate-500"}`}>
                {licenceFileName ?? "Upload licence (image or PDF)"}
              </span>
            </button>
          </div>
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <button type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
        </button>
        <p className="text-center text-xs text-slate-400">
          Your details go to our verification team. You&apos;ll be listed publicly only once approved.
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

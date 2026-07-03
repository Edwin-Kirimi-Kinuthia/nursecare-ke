"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon, Stethoscope, FileText, Pill, ShieldCheck, Save, CheckCircle2, Download,
} from "lucide-react";
import type {
  PatientProfile, ProviderProfile, MedicalHistoryEntry,
} from "@carebora/api-client";
import { api, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-40 rounded-3xl skeleton" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="h-24 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border-4 border-white bg-gradient-to-br from-teal-100 to-emerald-100 text-3xl font-bold text-teal-700 shadow">
              {user.fullName.charAt(0)}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold text-slate-900">{user.fullName}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {user.email}
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold capitalize text-teal-700">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.role === "patient" && <PatientSection />}
      {["doctor", "nurse", "physio", "pharmacy"].includes(user.role) && <ProviderSection />}
      {user.role === "admin" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-600" /> Administrator</div>
          <p className="mt-2 text-sm text-slate-500">Manage the platform from the operations dashboard.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Open dashboard</Link>
        </div>
      )}
    </div>
  );
}

/* ── shared field ─────────────────────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
    </label>
  );
}

function Saved({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>;
}

/* ── patient ──────────────────────────────────────────────────────────────── */
function PatientSection() {
  const [p, setP] = useState<PatientProfile | null>(null);
  const [history, setHistory] = useState<MedicalHistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [prof, hist] = await Promise.all([api.getPatientProfile(), api.getMedicalHistory()]);
        if (active) { setP(prof); setHistory(hist.consultations); }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  async function save() {
    if (!p) return;
    setSaving(true); setSaved(false);
    try {
      const updated = await api.patchPatientProfile({
        gender: p.gender ?? undefined,
        county: p.county ?? undefined,
        town: p.town ?? undefined,
        addressLine: p.addressLine ?? undefined,
        bloodGroup: p.bloodGroup ?? undefined,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        emergencyContactName: p.emergencyContactName ?? undefined,
        emergencyContactPhone: p.emergencyContactPhone ?? undefined,
      });
      setP(updated);
      setSaved(true);
    } finally { setSaving(false); }
  }

  const set = (k: keyof PatientProfile, v: unknown) => setP((cur) => cur ? { ...cur, [k]: v } as PatientProfile : cur);
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  if (!p) return <div className="mt-6 h-48 rounded-2xl skeleton" />;

  return (
    <>
      {/* Personal details */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><UserIcon className="h-5 w-5 text-teal-600" /> Personal details</h2>
          <Saved show={saved} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Gender" value={p.gender ?? ""} onChange={(v) => set("gender", v)} />
          <Field label="Blood group" value={p.bloodGroup ?? ""} onChange={(v) => set("bloodGroup", v)} placeholder="e.g. O+" />
          <Field label="County" value={p.county ?? ""} onChange={(v) => set("county", v)} />
          <Field label="Town" value={p.town ?? ""} onChange={(v) => set("town", v)} />
          <Field label="Address" value={p.addressLine ?? ""} onChange={(v) => set("addressLine", v)} />
          <Field label="Allergies (comma-separated)" value={p.allergies.join(", ")} onChange={(v) => set("allergies", list(v))} />
          <Field label="Chronic conditions (comma-separated)" value={p.chronicConditions.join(", ")} onChange={(v) => set("chronicConditions", list(v))} />
          <Field label="Emergency contact name" value={p.emergencyContactName ?? ""} onChange={(v) => set("emergencyContactName", v)} />
          <Field label="Emergency contact phone" value={p.emergencyContactPhone ?? ""} onChange={(v) => set("emergencyContactPhone", v)} />
        </div>
        <button onClick={save} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Medical history */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><FileText className="h-5 w-5 text-teal-600" /> Medical history</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No consultations yet. Your doctors&apos; notes and prescriptions will appear here.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {history.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{c.appointment.provider.user.fullName}
                    <span className="ml-2 text-xs font-normal text-slate-400">{c.appointment.provider.specialty}</span>
                  </div>
                  <span className="text-xs text-slate-400">{when(c.appointment.slot?.startsAt ?? c.createdAt)}</span>
                </div>
                {c.clinicalNotes ? (
                  <>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{c.clinicalNotes}</p>
                    <a
                      href={api.treatmentSheetPdfUrl(c.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> Download treatment sheet (PDF)
                    </a>
                  </>
                ) : (
                  <p className="mt-2 text-sm italic text-slate-400">No clinical notes recorded.</p>
                )}
                {c.prescriptions.length > 0 && (
                  <div className="mt-3 rounded-lg bg-teal-50/60 p-3">
                    <div className="flex items-center gap-1 text-xs font-semibold text-teal-700"><Pill className="h-3.5 w-3.5" /> Prescription</div>
                    <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                      {c.prescriptions.flatMap((rx) => rx.medications).map((m, i) => (
                        <li key={i}>• <span className="font-medium text-slate-800">{m.name}</span> — {m.dosage}, {m.frequency}, {m.duration}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── provider ─────────────────────────────────────────────────────────────── */
function ProviderSection() {
  const [p, setP] = useState<ProviderProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => { try { const prof = await api.getProviderProfile(); if (active) setP(prof); } catch { /* ignore */ } })();
    return () => { active = false; };
  }, []);

  async function save() {
    if (!p) return;
    setSaving(true); setSaved(false);
    try {
      const updated = await api.patchProviderProfile({
        specialty: p.specialty ?? undefined,
        bio: p.bio ?? undefined,
        county: p.county ?? undefined,
        town: p.town ?? undefined,
        languages: p.languages,
        services: p.services,
        consultationFeeKes: p.consultationFeeKes ?? undefined,
        homeVisitFeeKes: p.homeVisitFeeKes ?? undefined,
        isAvailable: p.isAvailable,
      });
      setP(updated); setSaved(true);
    } finally { setSaving(false); }
  }

  const set = (k: keyof ProviderProfile, v: unknown) => setP((cur) => cur ? { ...cur, [k]: v } as ProviderProfile : cur);
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  if (!p) return <div className="mt-6 h-48 rounded-2xl skeleton" />;

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Stethoscope className="h-5 w-5 text-teal-600" /> Professional profile</h2>
        <Saved show={saved} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Specialty" value={p.specialty ?? ""} onChange={(v) => set("specialty", v)} />
        <Field label="County" value={p.county ?? ""} onChange={(v) => set("county", v)} />
        <Field label="Town" value={p.town ?? ""} onChange={(v) => set("town", v)} />
        <Field label="Consultation fee (KES)" value={String(p.consultationFeeKes ?? "")} onChange={(v) => set("consultationFeeKes", v ? Number(v) : null)} />
        <Field label="Home visit fee (KES)" value={String(p.homeVisitFeeKes ?? "")} onChange={(v) => set("homeVisitFeeKes", v ? Number(v) : null)} />
        <Field label="Languages (comma-separated)" value={p.languages.join(", ")} onChange={(v) => set("languages", list(v))} />
        <Field label="Services (comma-separated)" value={p.services.join(", ")} onChange={(v) => set("services", list(v))} />
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">Bio</span>
        <textarea value={p.bio ?? ""} onChange={(e) => set("bio", e.target.value)} rows={3}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
      </label>
      <label className="mt-4 flex items-center gap-2">
        <input type="checkbox" checked={p.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} className="h-4 w-4 rounded accent-teal-600" />
        <span className="text-sm text-slate-700">Available for new bookings</span>
      </label>
      <button onClick={save} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

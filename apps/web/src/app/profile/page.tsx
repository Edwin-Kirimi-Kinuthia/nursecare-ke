"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon, Stethoscope, FileText, Pill, ShieldCheck, Save, CheckCircle2, Download, KeyRound, Eye, EyeOff, ArrowLeft,
} from "lucide-react";
import type {
  PatientProfile, ProviderProfile, MedicalHistoryEntry,
} from "@carebora/api-client";
import { ApiError, passwordMeetsRules } from "@carebora/shared";
import { api, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PhoneField } from "@/components/PhoneField";
import { PasswordField } from "@/components/PasswordField";
import IdentityCard from "@/components/IdentityCard";

export default function ProfilePage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-40 rounded-3xl skeleton" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <IdentityCard user={user} onSaved={refresh} />

      {/* Everyone has patient details of their own — blood group, allergies, an
          emergency contact — because any account can receive care. A clinician
          who books a consultation for themselves needs these on file just as
          much as a patient does, and the endpoint creates the profile on first
          use. Role only adds the sections below. */}
      <PatientSection />
      {["doctor", "nurse", "physio", "pharmacy"].includes(user.role) && <ProviderSection />}
      {user.role === "admin" && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-600" /> Administrator</div>
          <p className="mt-2 text-sm text-slate-500">Manage the platform from the operations dashboard.</p>
          <Link href="/admin" className="mt-4 inline-block rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Open dashboard</Link>
        </div>
      )}

      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true); setDone(false);
    try {
      await api.requestChangePassword({ currentPassword });
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await api.confirmChangePassword({ code, newPassword });
      setCurrentPassword(""); setNewPassword(""); setCode("");
      setStep("form"); setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null); setNotice(null); setBusy(true);
    try {
      await api.requestChangePassword({ currentPassword });
      setNotice("Code resent — check your inbox.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 font-bold text-slate-900"><KeyRound className="h-5 w-5 text-teal-600" /> Change password</div>

      {step === "form" ? (
        <form onSubmit={requestCode} className="mt-4 grid gap-3 sm:grid-cols-2">
          <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" showStrength />
          {error && <p className="sm:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {done && <p className="sm:col-span-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password updated.</p>}
          <button type="submit" disabled={busy || !currentPassword || !passwordMeetsRules(newPassword)}
            className="sm:col-span-2 w-fit rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {busy ? "Sending code…" : "Send confirmation code"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-4 max-w-xs space-y-3">
          <p className="text-sm text-slate-500">We emailed you a 6-digit code to confirm this change. Enter it below.</p>
          <Field
            label="Confirmation code" value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
          />
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {notice && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-700">{notice}</p>}
          <button type="submit" disabled={busy || code.length !== 6}
            className="w-fit rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {busy ? "Confirming…" : "Confirm password change"}
          </button>
          <div className="flex items-center gap-4 pt-1 text-sm">
            <button type="button" onClick={resend} disabled={busy} className="font-semibold text-teal-700 hover:underline disabled:opacity-60">Resend code</button>
            <button type="button" onClick={() => { setStep("form"); setError(null); setNotice(null); }} className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── shared field ─────────────────────────────────────────────────────────── */
function Field({
  label, value, onChange, placeholder, type = "text", revealable, list,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; revealable?: boolean;
  /** id of a <datalist> to suggest values from. */
  list?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const resolvedType = revealable ? (reveal ? "text" : "password") : type;
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1">
        <input type={resolvedType} value={value} placeholder={placeholder} list={list} onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${revealable ? "pr-10" : ""}`} />
        {revealable && (
          <button type="button" tabIndex={-1} onClick={() => setReveal((r) => !r)} aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600">
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
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
  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [prof, hist] = await Promise.all([api.getPatientProfile(), api.getMedicalHistory()]);
        if (active) {
          setP(prof); setHistory(hist.consultations);
          setAllergiesText(prof.allergies.join(", "));
          setConditionsText(prof.chronicConditions.join(", "));
        }
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
        allergies: list(allergiesText),
        chronicConditions: list(conditionsText),
        emergencyContactName: p.emergencyContactName ?? undefined,
        emergencyContactPhone: p.emergencyContactPhone ?? undefined,
      });
      setP(updated);
      setAllergiesText(updated.allergies.join(", "));
      setConditionsText(updated.chronicConditions.join(", "));
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
          <Field label="Allergies (comma-separated)" value={allergiesText} onChange={setAllergiesText} />
          <Field label="Chronic conditions (comma-separated)" value={conditionsText} onChange={setConditionsText} />
          <Field label="Emergency contact name" value={p.emergencyContactName ?? ""} onChange={(v) => set("emergencyContactName", v)} />
          <PhoneField label="Emergency contact phone" value={p.emergencyContactPhone ?? ""} onChange={(v) => set("emergencyContactPhone", v)} />
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
  const [languagesText, setLanguagesText] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prof = await api.getProviderProfile();
        if (active) {
          setP(prof);
          setLanguagesText(prof.languages.join(", "));
          setServicesText(prof.services.join(", "));
        }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, []);

  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    api.listSpecialties()
      .then((r) => { if (active) setSpecialtyOptions(r.specialties.map((x) => x.name)); })
      .catch(() => { /* suggestions are optional */ });
    return () => { active = false; };
  }, []);

  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleErr, setToggleErr] = useState<string | null>(null);

  /**
   * Flip availability immediately. It's a live status — "I'm free" / "I'm with
   * another client" — so making it wait for a Save click at the bottom of a
   * long form defeats it. Optimistic, and put back if the save fails.
   */
  async function toggleAvailable(next: boolean) {
    if (!p) return;
    const previous = p.isAvailable;
    setP({ ...p, isAvailable: next });
    setToggleBusy(true); setToggleErr(null);
    try {
      await api.patchProviderProfile({ isAvailable: next });
    } catch (e) {
      setP((cur) => (cur ? { ...cur, isAvailable: previous } : cur));
      setToggleErr(e instanceof Error ? e.message : "Could not update your availability.");
    } finally {
      setToggleBusy(false);
    }
  }

  async function save() {
    if (!p) return;
    setSaving(true); setSaved(false);
    try {
      const updated = await api.patchProviderProfile({
        specialty: p.specialty ?? undefined,
        subSpecialty: p.subSpecialty ?? undefined,
        bio: p.bio ?? undefined,
        county: p.county ?? undefined,
        town: p.town ?? undefined,
        languages: list(languagesText),
        services: list(servicesText),
        consultationFeeKes: p.consultationFeeKes ?? undefined,
        homeVisitFeeKes: p.homeVisitFeeKes ?? undefined,
      });
      setP(updated);
      setLanguagesText(updated.languages.join(", "));
      setServicesText(updated.services.join(", "));
      setSaved(true);
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
      {/* Suggestions from what's already on the platform, so "Paediatrics" and
          "Pediatrics" don't end up as two separate filter chips. Free text is
          still allowed — a new specialty has to be enterable. */}
      <datalist id="specialty-options">
        {specialtyOptions.map((n) => <option key={n} value={n} />)}
      </datalist>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Specialty" list="specialty-options" placeholder="e.g. Internal Medicine" value={p.specialty ?? ""} onChange={(v) => set("specialty", v)} />
        <Field label="Sub-specialty (optional)" list="specialty-options" placeholder="e.g. Cardiology" value={p.subSpecialty ?? ""} onChange={(v) => set("subSpecialty", v)} />
        <Field label="County" value={p.county ?? ""} onChange={(v) => set("county", v)} />
        <Field label="Town" value={p.town ?? ""} onChange={(v) => set("town", v)} />
        <Field label="Consultation fee (KES)" value={String(p.consultationFeeKes ?? "")} onChange={(v) => set("consultationFeeKes", v ? Number(v) : null)} />
        <Field label="Home visit fee (KES)" value={String(p.homeVisitFeeKes ?? "")} onChange={(v) => set("homeVisitFeeKes", v ? Number(v) : null)} />
        <Field label="Languages (comma-separated)" value={languagesText} onChange={setLanguagesText} />
        <Field label="Services (comma-separated)" value={servicesText} onChange={setServicesText} />
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">Bio</span>
        <textarea value={p.bio ?? ""} onChange={(e) => set("bio", e.target.value)} rows={3}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
      </label>
      <div className={`mt-5 rounded-2xl border p-4 transition ${p.isAvailable ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-semibold text-slate-900">
              <span className={`h-2.5 w-2.5 rounded-full ${p.isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden />
              {p.isAvailable ? "Available" : "Busy"}
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              {p.isAvailable
                ? "New bookings are confirmed instantly, so patients can pay and be ready for their slot without waiting on you."
                : "Patients can still book you, but each booking waits for your confirmation first. Switch back to Available when you're free."}
            </span>
          </span>
          {/* Applies the moment it's flipped — a live status, not a form field. */}
          <span className="relative mt-0.5 inline-flex shrink-0">
            <input
              type="checkbox"
              role="switch"
              aria-label="Available for instant bookings"
              checked={p.isAvailable}
              disabled={toggleBusy}
              onChange={(e) => toggleAvailable(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-disabled:opacity-60" />
            <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
        {toggleErr && <p className="mt-2 text-xs text-rose-600">{toggleErr}</p>}
        {(!p.consultationFeeKes || p.consultationFeeKes <= 0) && (
          <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-amber-800">
            Set a consultation fee below to open your calendar — you can&apos;t be booked until you do.
          </p>
        )}
      </div>
      <button onClick={save} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

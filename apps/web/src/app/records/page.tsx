"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, ShieldAlert, Stethoscope, Pill, Activity, Syringe, Paperclip,
  Plus, Loader2, Lock, Eye, Ban, X, Download,
} from "lucide-react";
import { ApiError, clinicalTemplateFor, type CreateAllergyInput, type CreateConditionInput, type CreateMedicationEntryInput, type GrantAccessInput } from "@carebora/shared";
import { api, when } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useSection, SectionShell } from "@/components/dashboard/section";
import PageHeader from "@/components/PageHeader";

type Tab = "overview" | "documents" | "consultations" | "access";

export default function RecordsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const fetcher = useCallback(() => (user ? api.getRecord(user.id) : Promise.reject(new Error("not signed in"))), [user]);
  const { data: record, loading, error, reload } = useSection(fetcher);

  if (authLoading) return <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-40 rounded-2xl skeleton" /></div>;
  if (!user) { router.push("/login"); return null; }

  const TABS: { id: Tab; label: string; Icon: typeof FileText }[] = [
    { id: "overview", label: "Overview", Icon: Activity },
    { id: "documents", label: "Documents", Icon: Paperclip },
    { id: "consultations", label: "Consultations", Icon: Stethoscope },
    { id: "access", label: "Access", Icon: Lock },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow="Health record"
        Icon={FileText}
        title="My medical record"
        lede="Everything about your care, in one place. You control who else can see it."
      />

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <SectionShell loading={loading} error={error} onRetry={reload} empty={!record} emptyText="No record yet.">
          {record && (
            <>
              {tab === "overview" && <OverviewTab patientId={user.id} record={record} onChanged={reload} />}
              {tab === "documents" && <DocumentsTab patientId={user.id} documents={record.documents} onChanged={reload} />}
              {tab === "consultations" && <ConsultationsTab consultations={record.consultations} />}
              {tab === "access" && <AccessTab patientId={user.id} />}
            </>
          )}
        </SectionShell>
      </div>
    </div>
  );
}

function OverviewTab({ patientId, record, onChanged }: { patientId: string; record: NonNullable<ReturnType<typeof useSection<import("@carebora/api-client").PatientRecord>>["data"]>; onChanged: () => void }) {
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [addingCondition, setAddingCondition] = useState(false);
  const [addingMedication, setAddingMedication] = useState(false);

  return (
    <div className="space-y-5">
      <Section title="Allergies" icon={ShieldAlert} onAdd={() => setAddingAllergy(true)}>
        {record.allergies.length === 0 ? <Empty text="No allergies recorded." /> : (
          <ul className="space-y-2">
            {record.allergies.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span><span className="font-medium text-slate-800">{a.substance}</span> {a.reaction && <span className="text-slate-500"> — {a.reaction}</span>}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${a.severity === "severe" ? "bg-rose-100 text-rose-700" : a.severity === "moderate" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{a.severity}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Conditions" icon={Activity} onAdd={() => setAddingCondition(true)}>
        {record.conditions.length === 0 ? <Empty text="No conditions recorded." /> : (
          <ul className="space-y-2">
            {record.conditions.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Medications" icon={Pill} onAdd={() => setAddingMedication(true)}>
        {record.medications.length === 0 ? <Empty text="No medications recorded." /> : (
          <ul className="space-y-2">
            {record.medications.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{m.name} {m.dosage && <span className="font-normal text-slate-500">— {m.dosage}, {m.frequency}</span>}</span>
                {!m.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Ended</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Vitals (recent)" icon={Activity}>
        {record.vitals.length === 0 ? <Empty text="No vitals recorded." /> : (
          <ul className="space-y-2">
            {record.vitals.slice(0, 10).map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="capitalize text-slate-700">{v.type.replace(/_/g, " ")}: <span className="font-medium">{v.value}{v.unit ? ` ${v.unit}` : ""}</span></span>
                <span className="text-xs text-slate-400">{when(v.recordedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Immunizations" icon={Syringe}>
        {record.immunizations.length === 0 ? <Empty text="No immunizations recorded." /> : (
          <ul className="space-y-2">
            {record.immunizations.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{i.vaccine}{i.doseNumber ? ` (dose ${i.doseNumber})` : ""}</span>
                <span className="text-xs text-slate-400">{when(i.administeredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {addingAllergy && <AllergyModal patientId={patientId} onClose={() => setAddingAllergy(false)} onSaved={() => { setAddingAllergy(false); onChanged(); }} />}
      {addingCondition && <ConditionModal patientId={patientId} onClose={() => setAddingCondition(false)} onSaved={() => { setAddingCondition(false); onChanged(); }} />}
      {addingMedication && <MedicationModal patientId={patientId} onClose={() => setAddingMedication(false)} onSaved={() => { setAddingMedication(false); onChanged(); }} />}
    </div>
  );
}

function Section({ title, icon: Icon, onAdd, children }: { title: string; icon: typeof Activity; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Icon className="h-4 w-4 text-teal-600" /> {title}</h2>
        {onAdd && (
          <button onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400">{text}</p>;
}

function AllergyModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateAllergyInput>({ substance: "", severity: "mild", reaction: undefined });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await api.addAllergy(patientId, form); onSaved(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Add allergy" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.substance} onChange={(e) => setForm((f) => ({ ...f, substance: e.target.value }))} placeholder="Substance (e.g. Penicillin)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as CreateAllergyInput["severity"] }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
        </select>
        <input value={form.reaction ?? ""} onChange={(e) => setForm((f) => ({ ...f, reaction: e.target.value || undefined }))} placeholder="Reaction (optional)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <ModalActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ConditionModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateConditionInput>({ name: "", status: "active" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await api.addCondition(patientId, form); onSaved(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Add condition" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Condition (e.g. Hypertension)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CreateConditionInput["status"] }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="active">Active</option><option value="chronic">Chronic</option><option value="resolved">Resolved</option>
        </select>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <ModalActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function MedicationModal({ patientId, onClose, onSaved }: { patientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateMedicationEntryInput>({ name: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await api.addMedication(patientId, form); onSaved(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to save"); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Add medication" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Medication name"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={form.dosage ?? ""} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value || undefined }))} placeholder="Dosage"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input value={form.frequency ?? ""} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value || undefined }))} placeholder="Frequency"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <ModalActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white max-h-[90dvh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-3">
      <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        {busy ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
    </div>
  );
}

function DocumentsTab({ patientId, documents, onChanged }: { patientId: string; documents: import("@carebora/api-client").MedicalDocument[]; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8_000_000) { setErr("File must be under 8MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setBusy(true); setErr(null);
      try {
        await api.uploadMedicalDocument(patientId, { type: "other", title: title || file.name, fileUrl: reader.result as string });
        setUploading(false); setTitle(""); onChanged();
      } catch (e) { setErr(e instanceof ApiError ? e.message : "Upload failed"); }
      finally { setBusy(false); }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">Documents</h2>
        <button onClick={() => setUploading(true)} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100">
          <Plus className="h-3.5 w-3.5" /> Upload
        </button>
      </div>
      {documents.length === 0 ? <p className="mt-3 text-sm text-slate-400">No documents uploaded.</p> : (
        <ul className="mt-3 space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-700 hover:underline">{d.title}</a>
              <span className="text-xs capitalize text-slate-400">{d.type.replace(/_/g, " ")} · {when(d.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      {uploading && (
        <Modal title="Upload document" onClose={() => setUploading(false)}>
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <input type="file" accept="image/*,.pdf" onChange={onFile} disabled={busy}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            {busy && <p className="flex items-center gap-1.5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</p>}
            {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

/**
 * A patient's clinical documentation: the doctor's treatment sheet, the nurse's
 * care plan / cardex, or the physio's assessment — rendered with the same
 * labelled sections the clinician filled in, plus a PDF of the whole thing.
 */
function ConsultationsTab({ consultations }: { consultations: import("@carebora/api-client").MedicalHistoryEntry[] }) {
  return (
    <div className="space-y-3">
      {consultations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Consultations</h2>
          <p className="mt-3 text-sm text-slate-400">No consultations yet.</p>
        </div>
      ) : consultations.map((c) => {
        const template = clinicalTemplateFor(c.appointment.provider.user.role);
        const record = c.clinicalRecord ?? {};
        const filled = template.sections
          .map((s) => ({ label: s.label, value: (record[s.key] ?? "").trim() }))
          .filter((s) => s.value.length > 0);

        return (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{c.appointment.provider.user.fullName}</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {template.title}
                  {c.appointment.provider.specialty ? ` · ${c.appointment.provider.specialty}` : ""}
                  {" · "}{when(c.appointment.slot?.startsAt ?? c.createdAt)}
                </div>
              </div>
              {(filled.length > 0 || c.prescriptions.length > 0) && (
                <a
                  href={`/api/v1/consultations/${c.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
              )}
            </div>

            {filled.length > 0 ? (
              <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                {filled.map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : c.clinicalNotes ? (
              <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600">{c.clinicalNotes}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Your clinician hasn&apos;t written this up yet.</p>
            )}

            {c.prescriptions.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prescribed</div>
                <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
                  {c.prescriptions.flatMap((rx) =>
                    rx.medications.map((m, i) => (
                      <li key={`${rx.id}-${i}`}>
                        <span className="font-medium">{m.name}</span>
                        {[m.dosage, m.frequency, m.duration].filter(Boolean).length > 0 && (
                          <span className="text-slate-500"> — {[m.dosage, m.frequency, m.duration].filter(Boolean).join(", ")}</span>
                        )}
                      </li>
                    )),
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AccessTab({ patientId }: { patientId: string }) {
  const grantsFetcher = useCallback(() => api.listAccessGrants(patientId).then((r) => r.grants), [patientId]);
  const { data: grants, loading, error, reload } = useSection(grantsFetcher);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const logFetcher = useCallback(() => api.listAccessLog(patientId).then((r) => r.logs), [patientId]);
  const { data: logs } = useSection(logFetcher);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const input: GrantAccessInput = { granteeEmail: email, scope: ["all"] };
      await api.grantAccess(patientId, input);
      setEmail(""); setInviting(false); await reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed to grant access"); }
    finally { setBusy(false); }
  }

  async function revoke(grantId: string) {
    try { await api.revokeAccess(patientId, grantId); await reload(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Failed to revoke"); }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Lock className="h-4 w-4 text-teal-600" /> Who can see your record</h2>
          <button onClick={() => setInviting(true)} className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100">
            <Plus className="h-3.5 w-3.5" /> Grant access
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Providers you&apos;ve had a confirmed appointment with can always see your record. Grant standing access to anyone else here.</p>
        <SectionShell loading={loading} error={error} onRetry={reload} empty={(grants ?? []).length === 0} emptyText="No standing grants.">
          <ul className="mt-3 space-y-2">
            {(grants ?? []).map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{g.granteeUser?.fullName ?? "Unknown"} <span className="font-normal text-slate-400">({g.granteeUser?.email})</span></span>
                <button onClick={() => revoke(g.id)} className="inline-flex items-center gap-1 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" title="Revoke"><Ban className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </SectionShell>
        {inviting && (
          <Modal title="Grant access" onClose={() => setInviting(false)}>
            <form onSubmit={invite} className="space-y-3">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="provider@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {err && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
              <ModalActions busy={busy} onClose={() => setInviting(false)} />
            </form>
          </Modal>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <button onClick={() => setShowLog((s) => !s)} className="flex w-full items-center justify-between text-left">
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Eye className="h-4 w-4 text-teal-600" /> Access log</h2>
          <span className="text-xs text-slate-400">{showLog ? "Hide" : "Show"}</span>
        </button>
        {showLog && (
          <ul className="mt-3 space-y-1.5">
            {(logs ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-xs">
                <span className={l.action === "denied" ? "text-rose-600" : l.action === "break_glass" ? "font-semibold text-amber-700" : "text-slate-600"}>
                  {l.actor.fullName} — {l.action.replace("_", " ")}{l.reason ? ` (${l.reason})` : ""}
                </span>
                <span className="text-slate-400">{when(l.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

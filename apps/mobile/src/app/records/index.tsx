import { useState } from "react";
import { Pressable, View } from "react-native";
import { FileText, Download, Plus } from "lucide-react-native";
import { clinicalTemplateFor } from "@carebora/shared";
import type { PatientRecord } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { dayTime } from "@/lib/format";
import { openAuthedPdf } from "@/lib/pdf";
import { pickDocumentDataUrl } from "@/lib/pickFile";
import { openSite } from "@/lib/links";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FormSheet } from "@/ui/FormSheet";
import { Segmented } from "@/ui/Segmented";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { useTheme } from "@/ui/theme";

type Tab = "overview" | "documents" | "consultations" | "access";

export default function RecordsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const rec = useAsync(() => (user ? api.getRecord(user.id) : Promise.resolve(null)), [user?.id]);
  const header = <PageHeader eyebrow="Health record" Icon={FileText} title="My medical record" lede="Everything about your care, in one place. You control who else can see it." />;
  if (!user) return <Screen>{header}<SignInPrompt icon="document-text-outline" title="Sign in to see your record" hint="Your allergies, medicines, results and consultation notes." /></Screen>;

  return (
    <Screen onRefresh={rec.reload} refreshing={rec.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      {header}
      <Segmented<Tab> value={tab} onChange={setTab} options={[
        { value: "overview", label: "Overview" }, { value: "documents", label: "Docs" }, { value: "consultations", label: "Visits" }, { value: "access", label: "Access" },
      ]} />
      {rec.error && <Banner tone="danger">{rec.error}</Banner>}
      {rec.loading && !rec.data ? <Loading /> : rec.data ? (
        <>
          {tab === "overview" && <Overview id={user.id} r={rec.data} reload={rec.reload} />}
          {tab === "documents" && <Documents id={user.id} r={rec.data} reload={rec.reload} />}
          {tab === "consultations" && <Consultations r={rec.data} />}
          {tab === "access" && <Access id={user.id} />}
        </>
      ) : null}
    </Screen>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <Card style={{ borderRadius: 20, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16 }}>{title}</Text>
        {onAdd && <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={`Add to ${title}`} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FDFA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Plus size={14} color="#0F766E" /><Text style={{ color: "#0F766E", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Add</Text></Pressable>}
      </View>
      {children}
    </Card>
  );
}
const Line = ({ left, right, tone }: { left: string; right?: string; tone?: "danger" | "warn" | "neutral" | "ok" }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1, borderColor: "#F1F5F9", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
    <Text style={{ flex: 1 }}>{left}</Text>
    {right ? (tone ? <Badge label={right} tone={tone} /> : <Text variant="caption" tone="faint">{right}</Text>) : null}
  </View>
);
const None = ({ text }: { text: string }) => <Text tone="faint">{text}</Text>;

type Adding = null | "allergy" | "condition" | "medication";
function Overview({ id, r, reload }: { id: string; r: PatientRecord; reload: () => void }) {
  const [adding, setAdding] = useState<Adding>(null);
  const done = () => { setAdding(null); reload(); };
  return (
    <>
      <Section title="Allergies" onAdd={() => setAdding("allergy")}>
        {r.allergies.length === 0 ? <None text="No allergies recorded." /> : r.allergies.map((a) => <Line key={a.id} left={a.reaction ? `${a.substance} — ${a.reaction}` : a.substance} right={a.severity} tone={a.severity === "severe" ? "danger" : a.severity === "moderate" ? "warn" : "neutral"} />)}
      </Section>
      <Section title="Conditions" onAdd={() => setAdding("condition")}>
        {r.conditions.length === 0 ? <None text="No conditions recorded." /> : r.conditions.map((c) => <Line key={c.id} left={c.name} right={c.status} tone="neutral" />)}
      </Section>
      <Section title="Medications" onAdd={() => setAdding("medication")}>
        {r.medications.length === 0 ? <None text="No medications recorded." /> : r.medications.map((m) => <Line key={m.id} left={`${m.name}${m.dosage ? ` — ${m.dosage}${m.frequency ? `, ${m.frequency}` : ""}` : ""}`} right={m.isActive ? undefined : "Ended"} tone="neutral" />)}
      </Section>
      <Section title="Vitals (recent)">
        {r.vitals.length === 0 ? <None text="No vitals recorded." /> : r.vitals.slice(0, 10).map((v) => <Line key={v.id} left={`${v.type.replace(/_/g, " ")}: ${v.value}${v.unit ? ` ${v.unit}` : ""}`} right={dayTime(v.recordedAt)} />)}
      </Section>
      <Section title="Immunizations">
        {r.immunizations.length === 0 ? <None text="No immunizations recorded." /> : r.immunizations.map((i) => <Line key={i.id} left={`${i.vaccine}${i.doseNumber ? ` (dose ${i.doseNumber})` : ""}`} right={dayTime(i.administeredAt)} />)}
      </Section>
      {adding === "allergy" && <AllergySheet id={id} onClose={() => setAdding(null)} onSaved={done} />}
      {adding === "condition" && <ConditionSheet id={id} onClose={() => setAdding(null)} onSaved={done} />}
      {adding === "medication" && <MedicationSheet id={id} onClose={() => setAdding(null)} onSaved={done} />}
    </>
  );
}

function useSave(onSaved: () => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setErr(null);
    try { await fn(); onSaved(); } catch (e) { setErr(errorMessage(e, "Failed to save.")); } finally { setBusy(false); }
  }
  return { busy, err, run };
}

function AllergySheet({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [substance, setSubstance] = useState(""); const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild"); const [reaction, setReaction] = useState("");
  const { busy, err, run } = useSave(onSaved);
  return (
    <FormSheet title="Add allergy" onClose={onClose}>
      <Field label="Substance" value={substance} onChangeText={setSubstance} placeholder="e.g. Penicillin" />
      <Select label="Severity" value={severity} onChange={setSeverity} options={[{ value: "mild", label: "Mild" }, { value: "moderate", label: "Moderate" }, { value: "severe", label: "Severe" }]} />
      <Field label="Reaction (optional)" value={reaction} onChangeText={setReaction} />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Save" loading={busy} disabled={!substance.trim()} onPress={() => run(() => api.addAllergy(id, { substance, severity, reaction: reaction || undefined }))} />
    </FormSheet>
  );
}
function ConditionSheet({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(""); const [status, setStatus] = useState<"active" | "chronic" | "resolved">("active");
  const { busy, err, run } = useSave(onSaved);
  return (
    <FormSheet title="Add condition" onClose={onClose}>
      <Field label="Condition" value={name} onChangeText={setName} placeholder="e.g. Hypertension" />
      <Select label="Status" value={status} onChange={setStatus} options={[{ value: "active", label: "Active" }, { value: "chronic", label: "Chronic" }, { value: "resolved", label: "Resolved" }]} />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Save" loading={busy} disabled={!name.trim()} onPress={() => run(() => api.addCondition(id, { name, status }))} />
    </FormSheet>
  );
}
function MedicationSheet({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(""); const [dosage, setDosage] = useState(""); const [frequency, setFrequency] = useState("");
  const { busy, err, run } = useSave(onSaved);
  return (
    <FormSheet title="Add medication" onClose={onClose}>
      <Field label="Medication name" value={name} onChangeText={setName} />
      <Field label="Dosage" value={dosage} onChangeText={setDosage} />
      <Field label="Frequency" value={frequency} onChangeText={setFrequency} />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Save" loading={busy} disabled={!name.trim()} onPress={() => run(() => api.addMedication(id, { name, dosage: dosage || undefined, frequency: frequency || undefined }))} />
    </FormSheet>
  );
}

function Documents({ id, r, reload }: { id: string; r: PatientRecord; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function upload() {
    setErr(null);
    try {
      const f = await pickDocumentDataUrl();
      if (!f) return;
      setBusy(true);
      await api.uploadMedicalDocument(id, { type: "other", title: title || f.name, fileUrl: f.dataUrl });
      setOpen(false); setTitle(""); reload();
    } catch (e) { setErr(errorMessage(e, "Upload failed.")); } finally { setBusy(false); }
  }
  return (
    <>
      <Section title="Documents" onAdd={() => setOpen(true)}>
        {r.documents.length === 0 ? <None text="No documents uploaded." /> : r.documents.map((d) => (
          <Pressable key={d.id} onPress={() => void openSite(d.fileUrl)} accessibilityRole="link">
            <Line left={d.title} right={`${d.type.replace(/_/g, " ")} · ${dayTime(d.createdAt)}`} />
          </Pressable>
        ))}
      </Section>
      {open && (
        <FormSheet title="Upload document" onClose={() => setOpen(false)}>
          <Field label="Title (optional)" value={title} onChangeText={setTitle} />
          {err && <Banner tone="danger">{err}</Banner>}
          <Button title="Choose a photo or PDF" loading={busy} onPress={upload} />
        </FormSheet>
      )}
    </>
  );
}

function Consultations({ r }: { r: PatientRecord }) {
  const [err, setErr] = useState<string | null>(null);
  if (r.consultations.length === 0) return <Empty icon="medkit-outline" title="No consultations yet" hint="Notes and prescriptions from your doctors appear here." />;
  return (
    <>
      {err && <Banner tone="danger">{err}</Banner>}
      {r.consultations.map((c) => {
        const template = clinicalTemplateFor(c.appointment.provider.user.role);
        const rec = c.clinicalRecord ?? {};
        const filled = template.sections.map((s) => ({ label: s.label, value: (rec[s.key] ?? "").trim() })).filter((s) => s.value);
        return (
          <Card key={c.id} style={{ borderRadius: 20, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>{c.appointment.provider.user.fullName}</Text>
                <Text variant="caption" tone="faint">{template.title}{c.appointment.provider.specialty ? ` · ${c.appointment.provider.specialty}` : ""} · {dayTime(c.appointment.slot?.startsAt ?? c.createdAt)}</Text>
              </View>
              {(filled.length > 0 || c.prescriptions.length > 0) && (
                <Pressable onPress={() => openAuthedPdf(api.treatmentSheetPdfUrl(c.id), `consultation-${c.id.slice(0, 8)}.pdf`).catch((e) => setErr(errorMessage(e, "Couldn't open the PDF.")))}
                  accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 10, height: 32 }}>
                  <Download size={14} color="#475569" /><Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#475569" }}>PDF</Text>
                </Pressable>
              )}
            </View>
            {filled.length > 0 ? filled.map((s) => (
              <View key={s.label} style={{ gap: 2 }}>
                <Text style={{ color: "#94A3B8", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 }}>{s.label.toUpperCase()}</Text>
                <Text>{s.value}</Text>
              </View>
            )) : c.clinicalNotes ? <Text tone="muted">{c.clinicalNotes}</Text> : <Text tone="faint">Your clinician hasn&apos;t written this up yet.</Text>}
            {c.prescriptions.length > 0 && (
              <View style={{ gap: 2 }}>
                <Text style={{ color: "#94A3B8", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 }}>PRESCRIBED</Text>
                {c.prescriptions.flatMap((rx) => rx.medications.map((m, i) => (
                  <Text key={`${rx.id}-${i}`}><Text style={{ fontFamily: "Inter_600SemiBold" }}>{m.name}</Text>{[m.dosage, m.frequency, m.duration].filter(Boolean).length ? ` — ${[m.dosage, m.frequency, m.duration].filter(Boolean).join(", ")}` : ""}</Text>
                )))}
              </View>
            )}
          </Card>
        );
      })}
    </>
  );
}

function Access({ id }: { id: string }) {
  const t = useTheme();
  const grants = useAsync(() => api.listAccessGrants(id).then((x) => x.grants), [id]);
  const logs = useAsync(() => api.listAccessLog(id).then((x) => x.logs), [id]);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { busy, err: saveErr, run } = useSave(() => { setInviting(false); setEmail(""); void grants.reload(); });
  return (
    <>
      <Section title="Who can see your record" onAdd={() => setInviting(true)}>
        <Text variant="caption" tone="faint">Providers you&apos;ve had a confirmed appointment with can always see your record. Grant standing access to anyone else here.</Text>
        {err && <Banner tone="danger">{err}</Banner>}
        {(grants.data ?? []).length === 0 ? <None text="No standing grants." /> : grants.data!.map((g) => (
          <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#F1F5F9", borderRadius: 12, padding: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_600SemiBold" }}>{g.granteeUser?.fullName ?? "Unknown"}</Text><Text variant="caption" tone="faint">{g.granteeUser?.email}</Text></View>
            <Button title="Revoke" variant="ghost" size="sm" onPress={() => api.revokeAccess(id, g.id).then(grants.reload).catch((e) => setErr(errorMessage(e, "Failed to revoke.")))} />
          </View>
        ))}
      </Section>
      <Card style={{ borderRadius: 20, padding: 16 }}>
        <Pressable onPress={() => setShowLog((s) => !s)} accessibilityRole="button" style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16 }}>Access log</Text><Text variant="caption" tone="faint">{showLog ? "Hide" : "Show"}</Text>
        </Pressable>
        {showLog && (logs.data ?? []).map((l) => (
          <View key={l.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text variant="caption" style={{ flex: 1, color: l.action === "denied" ? t.dangerText : l.action === "break_glass" ? t.warnText : t.textMuted }}>
              {l.actor.fullName} — {l.action.replace("_", " ")}{l.reason ? ` (${l.reason})` : ""}
            </Text>
            <Text variant="caption" tone="faint">{dayTime(l.at)}</Text>
          </View>
        ))}
      </Card>
      {inviting && (
        <FormSheet title="Grant access" onClose={() => setInviting(false)}>
          <Field label="Their email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="provider@email.com" />
          {saveErr && <Banner tone="danger">{saveErr}</Banner>}
          <Button title="Grant access" loading={busy} disabled={!email.includes("@")} onPress={() => run(() => api.grantAccess(id, { granteeEmail: email, scope: ["all"] }))} />
        </FormSheet>
      )}
    </>
  );
}

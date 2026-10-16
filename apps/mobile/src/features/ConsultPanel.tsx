import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { Check, Download, MessageSquare, Pill, Plus, Sparkles, X, FileText } from "lucide-react-native";
import { clinicalTemplateFor, type ClinicalRecord } from "@carebora/shared";
import type { FactCheckResult, MedicationRecord, RxRecord } from "@carebora/api-client";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { dayTime } from "@/lib/format";
import { openAuthedPdf } from "@/lib/pdf";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { useTheme } from "@/ui/theme";

type Tab = "notes" | "rx" | "chat" | "ai";
const EMPTY_MED: MedicationRecord = { name: "", dosage: "", frequency: "", duration: "" };

/**
 * The panel under the video: chat for everyone; for the clinician also the
 * clinical record (treatment sheet / cardex / assessment, autosaved), prescriptions
 * and an AI fact-check — the same tabs as the website's consultation room.
 */
export function ConsultPanel({ consultationId, role, isProvider, chat }: { consultationId: string; role: string; isProvider: boolean; chat: React.ReactNode }) {
  const t = useTheme();
  const [tab, setTab] = useState<Tab>(isProvider ? "notes" : "chat");
  const tabs: { key: Tab; label: string; Icon: typeof FileText }[] = [
    ...(isProvider ? [{ key: "notes" as const, label: clinicalTemplateFor(role).shortLabel, Icon: FileText }] : []),
    { key: "rx", label: "Rx", Icon: Pill },
    { key: "chat", label: "Chat", Icon: MessageSquare },
    ...(isProvider ? [{ key: "ai" as const, label: "AI", Icon: Sparkles }] : []),
  ];
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: t.border }}>
        {tabs.map(({ key, label, Icon }) => (
          <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}
            style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === key ? "#0D9488" : "transparent" }}>
            <Icon size={16} color={tab === key ? "#0F766E" : t.textMuted} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tab === key ? "#0F766E" : t.textMuted }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {tab === "chat" && chat}
        {tab === "notes" && isProvider && <Notes consultationId={consultationId} role={role} />}
        {tab === "rx" && <Prescriptions consultationId={consultationId} isProvider={isProvider} />}
        {tab === "ai" && isProvider && <FactCheck />}
      </View>
    </View>
  );
}

function Notes({ consultationId, role }: { consultationId: string; role: string }) {
  const t = useTheme();
  const template = clinicalTemplateFor(role);
  const [record, setRecord] = useState<ClinicalRecord>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let live = true;
    api.getConsultation(consultationId).then((c) => { if (live) { setRecord((c.clinicalRecord as ClinicalRecord) ?? {}); setLoaded(true); } }).catch(() => { if (live) setLoaded(true); });
    return () => { live = false; if (timer.current) clearTimeout(timer.current); };
  }, [consultationId]);

  function change(key: string, value: string) {
    const next = { ...record, [key]: value };
    setRecord(next);
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await api.patchConsultation(consultationId, { clinicalRecord: next }); setState("saved"); } catch { setState("error"); }
    }, 900);
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Inter_700Bold" }}>{template.title}</Text>
          <Text variant="caption" tone="faint">Saves automatically · appears in the patient&apos;s records</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Pressable onPress={() => openAuthedPdf(api.treatmentSheetPdfUrl(consultationId), "treatment-sheet.pdf").catch((e) => Alert.alert("PDF", errorMessage(e)))}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 10, height: 30 }} accessibilityRole="button">
            <Download size={13} color="#0F766E" /><Text style={{ fontSize: 12, color: "#0F766E", fontFamily: "Inter_600SemiBold" }}>PDF</Text>
          </Pressable>
          {state === "saving" && <Text variant="caption" tone="faint">Saving…</Text>}
          {state === "saved" && <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}><Check size={12} color="#059669" /><Text variant="caption" style={{ color: "#059669" }}>Saved</Text></View>}
          {state === "error" && <Text variant="caption" tone="danger">Save failed</Text>}
        </View>
      </View>
      {!loaded ? <Text tone="muted">Loading…</Text> : template.sections.map((s) => (
        <View key={s.key} style={{ gap: 4 }}>
          <Text style={{ color: "#64748B", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.6 }}>{s.label.toUpperCase()}</Text>
          <TextInput value={record[s.key] ?? ""} onChangeText={(v) => change(s.key, v)} placeholder={s.placeholder} placeholderTextColor={t.textFaint} multiline accessibilityLabel={s.label}
            style={{ minHeight: s.key === "diagnosis" || s.key === "treatmentPlan" || s.key === "examination" ? 84 : 60, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 10, fontSize: 15, color: t.text, backgroundColor: "#fff", textAlignVertical: "top" }} />
        </View>
      ))}
    </ScrollView>
  );
}

function Prescriptions({ consultationId, isProvider }: { consultationId: string; isProvider: boolean }) {
  const t = useTheme();
  const [list, setList] = useState<RxRecord[]>([]);
  const [meds, setMeds] = useState<MedicationRecord[]>([{ ...EMPTY_MED }]);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.listPrescriptions(consultationId).then(setList).catch(() => {}), [consultationId]);
  useEffect(() => { void load(); }, [load]);
  const setMed = (i: number, k: keyof MedicationRecord, v: string) => setMeds((m) => m.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const input = { borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 10, minHeight: 42, fontSize: 15, color: t.text, backgroundColor: "#fff" } as const;

  async function issue() {
    const valid = meds.filter((m) => m.name && m.dosage && m.frequency && m.duration);
    if (!valid.length) { setError("Add at least one complete medication."); return; }
    setBusy(true); setError(null);
    try {
      await api.createPrescription(consultationId, { medications: valid, instructions: instructions || undefined });
      setMeds([{ ...EMPTY_MED }]); setInstructions(""); await load();
    } catch (e) { setError(errorMessage(e, "Failed to issue prescription.")); } finally { setBusy(false); }
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12 }}>
      {isProvider && (
        <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, gap: 10 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>New prescription</Text>
          {meds.map((m, i) => (
            <View key={i} style={{ gap: 6 }}>
              <TextInput value={m.name} onChangeText={(v) => setMed(i, "name", v)} placeholder="Medication" placeholderTextColor={t.textFaint} style={input} />
              <View style={{ flexDirection: "row", gap: 6 }}>
                <TextInput value={m.dosage} onChangeText={(v) => setMed(i, "dosage", v)} placeholder="Dosage e.g. 500mg" placeholderTextColor={t.textFaint} style={[input, { flex: 1 }]} />
                <TextInput value={m.frequency} onChangeText={(v) => setMed(i, "frequency", v)} placeholder="3x daily" placeholderTextColor={t.textFaint} style={[input, { flex: 1 }]} />
              </View>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <TextInput value={m.duration} onChangeText={(v) => setMed(i, "duration", v)} placeholder="Duration e.g. 7 days" placeholderTextColor={t.textFaint} style={[input, { flex: 1 }]} />
                {meds.length > 1 && <Pressable onPress={() => setMeds(meds.filter((_, idx) => idx !== i))} hitSlop={8} accessibilityLabel="Remove medication"><X size={18} color={t.textFaint} /></Pressable>}
              </View>
            </View>
          ))}
          <Pressable onPress={() => setMeds([...meds, { ...EMPTY_MED }])} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityRole="button">
            <Plus size={14} color="#0F766E" /><Text style={{ color: "#0F766E", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Add medication</Text>
          </Pressable>
          <TextInput value={instructions} onChangeText={setInstructions} placeholder="Instructions (optional)" placeholderTextColor={t.textFaint} multiline style={[input, { minHeight: 56, paddingTop: 10, textAlignVertical: "top" }]} />
          {error && <Banner tone="danger">{error}</Banner>}
          <Button title="Issue prescription" size="sm" onPress={issue} loading={busy} />
        </View>
      )}
      {list.length === 0 && <Text tone="faint">No prescriptions yet.</Text>}
      {list.map((rx) => (
        <View key={rx.id} style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="caption" tone="faint">{dayTime(rx.issuedAt)}</Text>
            <Pressable onPress={() => openAuthedPdf(api.prescriptionPdfUrl(consultationId, rx.id), `prescription-${rx.id.slice(0, 8)}.pdf`).catch((e) => Alert.alert("PDF", errorMessage(e)))} accessibilityRole="button"
              style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Download size={13} color="#0F766E" /><Text style={{ color: "#0F766E", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>PDF</Text></Pressable>
          </View>
          {rx.medications.map((m, i) => <Text key={i}><Text style={{ fontFamily: "Inter_700Bold" }}>{m.name}</Text> {m.dosage} · {m.frequency} · {m.duration}</Text>)}
          {rx.instructions ? <Text variant="caption" tone="muted">{rx.instructions}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

function FactCheck() {
  const t = useTheme();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<FactCheckResult | null>(null);
  async function ask() {
    setBusy(true); setRes(null);
    try { setRes(await api.factCheck(q.trim())); } catch { setRes({ answer: "Could not reach the AI service.", disclaimer: "", pharmacySuggestions: [] }); } finally { setBusy(false); }
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12 }}>
      <Text variant="caption" tone="faint">Ask a clinical question — dosing, interactions, guidelines. It supports your judgement; it doesn&apos;t replace it.</Text>
      <TextInput value={q} onChangeText={setQ} placeholder="e.g. Max daily dose of paracetamol in a child of 20 kg?" placeholderTextColor={t.textFaint} multiline maxLength={500}
        style={{ minHeight: 80, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 10, fontSize: 15, color: t.text, backgroundColor: "#fff", textAlignVertical: "top" }} />
      <Button title="Ask" size="sm" onPress={ask} loading={busy} disabled={q.trim().length < 5} />
      {res && (
        <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 12, gap: 8 }}>
          <Text>{res.answer}</Text>
          {res.disclaimer ? <Text variant="caption" tone="faint">{res.disclaimer}</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}

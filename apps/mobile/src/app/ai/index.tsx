import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { AlertCircle, AlertTriangle, ArrowRight, Brain, CheckCircle2, ClipboardList, HelpCircle, Home, Pill, ShieldAlert, ShoppingBag, Stethoscope } from "lucide-react-native";
import type { ClinicalQueryResult, SymptomCheckResult } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { kes } from "@/lib/format";
import { absoluteUrl } from "@/lib/links";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Segmented } from "@/ui/Segmented";
import { Text } from "@/ui/Text";
import { Badge, Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

const URGENCY = {
  self_care: { label: "You can likely manage this at home", bg: "#ECFDF5", border: "#A7F3D0", fg: "#047857", Icon: Home },
  routine: { label: "See a clinician in the next few days", bg: "#F0F9FF", border: "#BAE6FD", fg: "#0369A1", Icon: CheckCircle2 },
  urgent: { label: "See a clinician today", bg: "#FFFBEB", border: "#FDE68A", fg: "#B45309", Icon: AlertCircle },
  emergency: { label: "Get emergency care now", bg: "#FFF1F2", border: "#FECDD3", fg: "#BE123C", Icon: AlertTriangle },
} as const;
const CLINICIANS = ["doctor", "nurse", "physio", "admin"];
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function AiScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"symptoms" | "clinical">("symptoms");
  const isClinician = !!user && CLINICIANS.includes(user.role);
  const header = (
    <PageHeader eyebrow={tab === "clinical" ? "Clinical assistant" : "Symptom checker"} Icon={tab === "clinical" ? Stethoscope : Brain}
      title={tab === "clinical" ? "Clinical reference" : "AI health check"}
      lede={tab === "clinical" ? "Doses, routes and durations, differential diagnoses and quick clinical answers." : "Likely causes, what you can do now, safe over-the-counter options and warning signs."} />
  );
  if (!user) return <Screen>{header}<SignInPrompt icon="pulse-outline" title="Sign in to use the symptom checker" hint="It's free for Care Bora members." /></Screen>;
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      {header}
      {isClinician && <Segmented value={tab} onChange={setTab} options={[{ value: "symptoms", label: "Symptoms" }, { value: "clinical", label: "Clinical" }]} />}
      {tab === "clinical" && isClinician ? <Clinical /> : <Symptoms />}
    </Screen>
  );
}

function Section({ title, Icon, color, children }: { title: string; Icon: typeof Brain; color: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon size={16} color={color} /><Text style={{ color, fontFamily: "Inter_700Bold" }}>{title}</Text></View>
      {children}
    </View>
  );
}
function Bullets({ items, color }: { items: string[]; color: string }) {
  return <>{items.map((t) => <View key={t} style={{ flexDirection: "row", gap: 8 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 8 }} /><Text style={{ flex: 1 }}>{t}</Text></View>)}</>;
}

function Symptoms() {
  const [symptoms, setSymptoms] = useState(""); const [age, setAge] = useState(""); const [duration, setDuration] = useState("");
  const [allergies, setAllergies] = useState(""); const [meds, setMeds] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [r, setR] = useState<SymptomCheckResult | null>(null);

  async function check() {
    setBusy(true); setError(null); setR(null);
    try {
      setR(await api.symptomCheck({
        symptoms: symptoms.trim(), patientAge: age ? parseInt(age, 10) : undefined, duration: duration.trim() || undefined,
        allergies: list(allergies).length ? list(allergies) : undefined, currentMedicines: list(meds).length ? list(meds) : undefined,
      }));
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const u = r ? URGENCY[r.urgency] ?? URGENCY.routine : null;

  return (
    <>
      <Field label="Describe your symptoms" value={symptoms} onChangeText={setSymptoms} multiline maxLength={1500}
        placeholder="e.g. Headache and fever for 3 days, chills at night…" style={{ minHeight: 110, textAlignVertical: "top", paddingTop: 12 }} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Age" value={age} onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 3))} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="For how long?" value={duration} onChangeText={setDuration} placeholder="e.g. 3 days" /></View>
      </View>
      <Field label="Allergies (optional)" value={allergies} onChangeText={setAllergies} placeholder="e.g. penicillin" />
      <Field label="Medicines you take (optional)" value={meds} onChangeText={setMeds} />
      <Pressable onPress={check} disabled={busy || symptoms.trim().length < 5} accessibilityRole="button"
        style={{ height: 50, borderRadius: 14, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: busy || symptoms.trim().length < 5 ? 0.5 : 1 }}>
        <Brain size={18} color="#fff" /><Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{busy ? "Thinking it through…" : "Check my symptoms"}</Text>
      </Pressable>
      {error && <Banner tone="danger">{error}</Banner>}
      {r && u && (
        <>
          <View style={{ backgroundColor: u.bg, borderWidth: 1, borderColor: u.border, borderRadius: 18, padding: 16, gap: 6 }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><u.Icon size={22} color={u.fg} /><Text style={{ color: u.fg, fontFamily: "Inter_700Bold", flex: 1 }}>{u.label}</Text></View>
            <Text style={{ color: u.fg }}>{r.advice}</Text>
            {r.seekEmergencyCare && <Button variant="danger" size="sm" title="Call 999" onPress={() => void Linking.openURL("tel:999")} />}
          </View>
          {r.possibleCauses.length > 0 && (
            <Section title="What it might be" Icon={Brain} color="#7C3AED">
              {r.possibleCauses.map((c) => (
                <View key={c.name} style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Text style={{ fontFamily: "Inter_700Bold" }}>{c.name}</Text><Badge label={c.likelihood} tone={c.likelihood === "more likely" ? "info" : "neutral"} /></View>
                  <Text tone="muted" style={{ fontSize: 14 }}>{c.why}</Text>
                </View>
              ))}
            </Section>
          )}
          {r.selfCare.length > 0 && <Section title="What you can do now" Icon={CheckCircle2} color="#0D9488"><Bullets items={r.selfCare} color="#14B8A6" /></Section>}
          <Section title="Get help urgently if" Icon={ShieldAlert} color="#E11D48"><Bullets items={r.redFlags} color="#F43F5E" /></Section>
          {r.otcOptions.length > 0 && (
            <Section title="Over-the-counter options" Icon={Pill} color="#EA580C">
              {r.otcOptions.map((o) => (
                <View key={o.name} style={{ backgroundColor: "#FFF7ED", borderRadius: 12, padding: 10, gap: 2 }}>
                  <Text style={{ fontFamily: "Inter_700Bold" }}>{o.name}</Text><Text style={{ fontSize: 14 }}>{o.howToUse}</Text>
                  {o.caution ? <Text variant="caption" style={{ color: "#C2410C" }}>⚠ {o.caution}</Text> : null}
                </View>
              ))}
            </Section>
          )}
          {r.pharmacySuggestions.length > 0 && (
            <Section title="Available at our pharmacy" Icon={ShoppingBag} color="#0F766E">
              {r.pharmacySuggestions.map((d) => (
                <Pressable key={d.id} onPress={() => router.push("/pharmacy")} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#F8FAFC", overflow: "hidden" }}>{d.imageUrl ? <Image source={{ uri: absoluteUrl(d.imageUrl) }} style={{ width: "100%", height: "100%" }} resizeMode="contain" /> : null}</View>
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>{d.name}</Text><Text style={{ color: "#0F766E", fontFamily: "Inter_700Bold" }}>{kes(d.priceKes)}</Text></View>
                </Pressable>
              ))}
            </Section>
          )}
          <Button title={`Find a ${r.recommendedSpecialty} provider`} icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push("/doctors")} />
          <Text variant="caption" tone="muted">{r.whenToSeeDoctor}</Text>
          <Text variant="caption" tone="faint" style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12 }}>{r.disclaimer}</Text>
        </>
      )}
    </>
  );
}

function Clinical() {
  const [mode, setMode] = useState<"drug" | "differential" | "question">("drug");
  const [query, setQuery] = useState(""); const [age, setAge] = useState(""); const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [r, setR] = useState<ClinicalQueryResult | null>(null);
  async function ask() {
    setBusy(true); setError(null); setR(null);
    try { setR(await api.clinicalQuery({ mode, query: query.trim(), patientAge: age ? parseInt(age, 10) : undefined, weightKg: weight ? parseFloat(weight) : undefined })); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <Segmented value={mode} onChange={(m) => { setMode(m); setR(null); }} options={[{ value: "drug", label: "Drug" }, { value: "differential", label: "Diagnoses" }, { value: "question", label: "Ask" }]} />
      <Field label={mode === "drug" ? "Medicine" : mode === "differential" ? "Presentation" : "Question"} value={query} onChangeText={setQuery} multiline={mode !== "drug"}
        placeholder={mode === "drug" ? "e.g. ceftriaxone" : mode === "differential" ? "e.g. 4 y/o, fever 3 days, fast breathing" : "e.g. IV to oral switch in pneumonia?"}
        style={mode !== "drug" ? { minHeight: 80, textAlignVertical: "top", paddingTop: 12 } : undefined} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Age (y)" value={age} onChangeText={(v) => setAge(v.replace(/\D/g, ""))} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Weight (kg)" value={weight} onChangeText={(v) => setWeight(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" /></View>
      </View>
      <Button title={busy ? "Looking it up…" : "Get reference"} loading={busy} disabled={query.trim().length < 2} onPress={ask} />
      {error && <Banner tone="danger">{error}</Banner>}
      {r && (
        <>
          {r.source !== "claude" && <Banner tone="warn">{r.source === "basic" ? "Answered by the basic AI model. Double-check every dose." : "The clinical assistant isn't configured yet."}</Banner>}
          {r.drug && (
            <>
              <View style={{ backgroundColor: "#F5F3FF", borderRadius: 18, padding: 16, gap: 4 }}>
                <Text style={{ color: "#7C3AED", fontFamily: "Inter_700Bold", fontSize: 12 }}>{r.drug.drugClass.toUpperCase()}</Text>
                <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>{r.drug.drug}</Text>
                {r.drug.indications.length > 0 && <Text tone="muted">{r.drug.indications.join(" · ")}</Text>}
              </View>
              <Section title="Dosing" Icon={Pill} color="#7C3AED">
                {r.drug.dosing.map((d, i) => (
                  <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: "#F1F5F9", paddingTop: i ? 8 : 0, gap: 2 }}>
                    <Text style={{ fontFamily: "Inter_700Bold" }}>{d.population}</Text>
                    <Text>{d.dose} · <Text style={{ color: "#7C3AED", fontFamily: "Inter_600SemiBold" }}>{d.route}</Text> · {d.frequency}</Text>
                    <Text variant="caption" tone="muted">Duration: {d.duration}{d.maxDose ? ` · Max: ${d.maxDose}` : ""}</Text>
                  </View>
                ))}
              </Section>
              {r.drug.contraindications.length > 0 && <Section title="Contraindications" Icon={ShieldAlert} color="#E11D48"><Bullets items={r.drug.contraindications} color="#F43F5E" /></Section>}
              {r.drug.interactions.length > 0 && <Section title="Interactions" Icon={AlertCircle} color="#D97706"><Bullets items={r.drug.interactions} color="#F59E0B" /></Section>}
              {r.drug.adjustments.length > 0 && <Section title="Renal / hepatic" Icon={HelpCircle} color="#0284C7"><Bullets items={r.drug.adjustments} color="#0EA5E9" /></Section>}
              {r.drug.pregnancyLactation ? <Section title="Pregnancy & breastfeeding" Icon={HelpCircle} color="#DB2777"><Text>{r.drug.pregnancyLactation}</Text></Section> : null}
            </>
          )}
          {r.differential && (
            <>
              {r.differential.summary ? <Banner tone="info">{r.differential.summary}</Banner> : null}
              <Section title="Differentials" Icon={ClipboardList} color="#7C3AED">
                <ScrollView scrollEnabled={false}>
                  {r.differential.differentials.map((d) => (
                    <View key={d.condition} style={{ paddingVertical: 6, gap: 2 }}>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Text style={{ fontFamily: "Inter_700Bold" }}>{d.condition}</Text><Badge label={d.likelihood} tone={d.likelihood === "must not miss" ? "danger" : d.likelihood === "most likely" ? "info" : "neutral"} /></View>
                      {d.supporting ? <Text variant="caption">For: {d.supporting}</Text> : null}
                      {d.against ? <Text variant="caption" tone="muted">Against: {d.against}</Text> : null}
                    </View>
                  ))}
                </ScrollView>
              </Section>
              {r.differential.redFlags.length > 0 && <Section title="Red flags" Icon={ShieldAlert} color="#E11D48"><Bullets items={r.differential.redFlags} color="#F43F5E" /></Section>}
              {r.differential.investigations.length > 0 && <Section title="Investigations" Icon={HelpCircle} color="#D97706"><Bullets items={r.differential.investigations} color="#F59E0B" /></Section>}
              {r.differential.initialManagement.length > 0 && <Section title="Initial management" Icon={Pill} color="#7C3AED"><Bullets items={r.differential.initialManagement} color="#8B5CF6" /></Section>}
              {r.differential.referWhen ? <Section title="Refer or admit when" Icon={AlertTriangle} color="#E11D48"><Text>{r.differential.referWhen}</Text></Section> : null}
            </>
          )}
          {r.answer ? <Section title="Answer" Icon={Brain} color="#7C3AED"><Text>{r.answer}</Text></Section> : null}
          <Text variant="caption" tone="faint" style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12 }}>{r.disclaimer}</Text>
        </>
      )}
    </>
  );
}

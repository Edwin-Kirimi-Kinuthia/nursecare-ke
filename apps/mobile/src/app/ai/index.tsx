import { absoluteUrl } from "@/lib/links";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { AlertCircle, AlertTriangle, ArrowRight, Brain, CheckCircle2, ShoppingBag } from "lucide-react-native";
import type { SymptomCheckResult } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { kes } from "@/lib/format";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

const URGENCY = {
  routine: { label: "Routine", bg: "#ECFDF5", border: "#A7F3D0", fg: "#047857", Icon: CheckCircle2 },
  urgent: { label: "Urgent", bg: "#FFFBEB", border: "#FDE68A", fg: "#B45309", Icon: AlertCircle },
  emergency: { label: "Emergency", bg: "#FFF1F2", border: "#FECDD3", fg: "#BE123C", Icon: AlertTriangle },
} as const;

export default function AiScreen() {
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SymptomCheckResult | null>(null);

  const header = <PageHeader eyebrow="Symptom checker" Icon={Brain} title="AI health check" lede="Describe your symptoms and get instant triage guidance. This is not a diagnosis — it tells you how urgently to seek care and who to see." />;
  if (!user) return <Screen>{header}<SignInPrompt icon="pulse-outline" title="Sign in to use the symptom checker" hint="It's free for Care Bora members." /></Screen>;

  async function check() {
    setBusy(true); setError(null); setResult(null);
    try { setResult(await api.symptomCheck({ symptoms: symptoms.trim(), patientAge: age ? parseInt(age, 10) : undefined })); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const u = result ? URGENCY[result.urgency] ?? URGENCY.routine : null;

  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      {header}
      <Field label="Describe your symptoms" value={symptoms} onChangeText={setSymptoms} multiline maxLength={1000}
        placeholder="e.g. A headache for 3 days, with some fever and neck stiffness…" style={{ minHeight: 110, textAlignVertical: "top", paddingTop: 12 }} hint={`${symptoms.length}/1000`} />
      <Field label="Age (optional)" value={age} onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 3))} keyboardType="number-pad" placeholder="e.g. 32" />
      <Pressable onPress={check} disabled={busy || symptoms.trim().length < 5} accessibilityRole="button"
        style={{ height: 50, borderRadius: 14, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: busy || symptoms.trim().length < 5 ? 0.5 : 1 }}>
        <Brain size={18} color="#fff" /><Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{busy ? "Analysing symptoms…" : "Check symptoms"}</Text>
      </Pressable>
      {error && <Banner tone="danger">{error}</Banner>}
      {result && u && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: u.bg, borderWidth: 1, borderColor: u.border, borderRadius: 16, padding: 14 }}>
            <u.Icon size={26} color={u.fg} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: u.fg, fontFamily: "Inter_700Bold" }}>{u.label} concern</Text>
              {result.seekEmergencyCare && <Text style={{ color: u.fg, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Please seek emergency care immediately.</Text>}
            </View>
          </View>
          <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 16, gap: 10 }}>
            <View><Text style={{ color: "#94A3B8", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 }}>RECOMMENDED SPECIALIST</Text><Text style={{ fontFamily: "Inter_700Bold", fontSize: 18 }}>{result.recommendedSpecialty}</Text></View>
            <View><Text style={{ color: "#94A3B8", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 }}>ADVICE</Text><Text>{result.advice}</Text></View>
          </View>
          {result.pharmacySuggestions.length > 0 && (
            <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ShoppingBag size={16} color="#0F766E" /><Text style={{ color: "#0F766E", fontFamily: "Inter_600SemiBold" }}>Available at our pharmacy</Text></View>
              <Text variant="caption" tone="faint">Over-the-counter options you can order now — not a substitute for professional advice.</Text>
              {result.pharmacySuggestions.map((d) => (
                <Pressable key={d.id} onPress={() => router.push("/pharmacy")} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 8 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "#F8FAFC", overflow: "hidden" }}>{d.imageUrl ? <Image source={{ uri: absoluteUrl(d.imageUrl) }} style={{ width: "100%", height: "100%" }} /> : null}</View>
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>{d.name}</Text><Text style={{ color: "#0F766E", fontFamily: "Inter_700Bold" }}>{kes(d.priceKes)}</Text></View>
                </Pressable>
              ))}
            </View>
          )}
          <Button title={`Find ${result.recommendedSpecialty} providers`} icon={<ArrowRight size={18} color="#fff" />} onPress={() => router.push("/doctors")} />
          <Text variant="caption" tone="muted" style={{ backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12 }}><Text variant="caption" style={{ fontFamily: "Inter_700Bold" }}>Disclaimer: </Text>{result.disclaimer}</Text>
        </>
      )}
    </Screen>
  );
}

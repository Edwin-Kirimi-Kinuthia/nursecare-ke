import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Stethoscope } from "lucide-react-native";
import { KENYA_COUNTIES } from "@carebora/shared";
import type { ProviderProfile } from "@carebora/api-client";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Select } from "@/ui/Select";
import { Banner, Chip, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { Text } from "@/ui/Text";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** A provider's public profile: specialty, fees, bio, languages. */
export default function EditProfessional() {
  const [p, setP] = useState<ProviderProfile | null>(null);
  const [languages, setLanguages] = useState(""); const [services, setServices] = useState("");
  const [suggest, setSuggest] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);
  useEffect(() => {
    api.getProviderProfile().then((x) => { setP(x); setLanguages(x.languages.join(", ")); setServices(x.services.join(", ")); }).catch((e) => setError(errorMessage(e)));
    api.listSpecialties().then((r) => setSuggest(r.specialties.map((s) => s.name))).catch(() => {});
  }, []);
  if (!p) return <Screen>{error ? <Banner tone="danger">{error}</Banner> : <Loading />}</Screen>;
  const set = <K extends keyof ProviderProfile>(k: K, v: ProviderProfile[K]) => setP({ ...p, [k]: v });
  const num = (v: string) => (v.replace(/\D/g, "") ? Number(v.replace(/\D/g, "")) : null);

  async function save() {
    if (!p) return;
    setBusy(true); setError(null);
    try {
      await api.patchProviderProfile({
        specialty: p.specialty ?? undefined, subSpecialty: p.subSpecialty ?? undefined, bio: p.bio ?? undefined,
        county: (p.county ?? undefined) as never, town: p.town ?? undefined,
        languages: list(languages), services: list(services),
        consultationFeeKes: p.consultationFeeKes ?? undefined, homeVisitFeeKes: p.homeVisitFeeKes ?? undefined,
      } as never);
      router.back();
    } catch (e) { setError(errorMessage(e, "Couldn't save.")); } finally { setBusy(false); }
  }
  const unmatched = suggest.filter((s) => s !== p.specialty).slice(0, 8);
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="My profile" Icon={Stethoscope} title="Professional profile" />
      {(!p.consultationFeeKes || p.consultationFeeKes <= 0) && <Banner tone="warn">Set a consultation fee to open your calendar — you can&apos;t be booked until you do.</Banner>}
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 18, gap: 14 }}>
        <Field label="Specialty" value={p.specialty ?? ""} onChangeText={(v) => set("specialty", v)} placeholder="e.g. Internal Medicine" />
        {unmatched.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text variant="caption" tone="faint">Already on Care Bora — tap to match spelling:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{unmatched.map((s) => <Chip key={s} label={s} onPress={() => set("specialty", s)} />)}</View>
          </View>
        )}
        <Field label="Sub-specialty (optional)" value={p.subSpecialty ?? ""} onChangeText={(v) => set("subSpecialty", v)} placeholder="e.g. Cardiology" />
        <Select label="County" value={p.county ?? ""} options={counties} onChange={(v) => set("county", v)} />
        <Field label="Town" value={p.town ?? ""} onChangeText={(v) => set("town", v)} />
        <Field label="Consultation fee (KES)" value={p.consultationFeeKes != null ? String(p.consultationFeeKes) : ""} onChangeText={(v) => set("consultationFeeKes", num(v))} keyboardType="number-pad" />
        <Field label="Home visit fee (KES)" value={p.homeVisitFeeKes != null ? String(p.homeVisitFeeKes) : ""} onChangeText={(v) => set("homeVisitFeeKes", num(v))} keyboardType="number-pad" />
        <Field label="Languages (comma-separated)" value={languages} onChangeText={setLanguages} />
        <Field label="Services (comma-separated)" value={services} onChangeText={setServices} />
        <Field label="Bio" value={p.bio ?? ""} onChangeText={(v) => set("bio", v)} multiline style={{ minHeight: 90, textAlignVertical: "top", paddingTop: 12 }} />
        {error && <Banner tone="danger">{error}</Banner>}
        <Button title="Save changes" onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}

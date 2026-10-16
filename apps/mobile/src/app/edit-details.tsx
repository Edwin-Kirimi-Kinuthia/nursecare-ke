import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { KENYA_COUNTIES } from "@carebora/shared";
import type { PatientProfile } from "@carebora/api-client";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import { Banner, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { User as UserIcon } from "lucide-react-native";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const GENDERS = [{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other / prefer not to say" }];

/** Patient health details (the website's "Personal details" card). */
export default function EditDetails() {
  const [p, setP] = useState<PatientProfile | null>(null);
  const [allergies, setAllergies] = useState(""); const [conditions, setConditions] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);
  useEffect(() => {
    api.getPatientProfile().then((x) => { setP(x); setAllergies(x.allergies.join(", ")); setConditions(x.chronicConditions.join(", ")); }).catch((e) => setError(errorMessage(e)));
  }, []);
  if (!p) return <Screen>{error ? <Banner tone="danger">{error}</Banner> : <Loading />}</Screen>;
  const set = <K extends keyof PatientProfile>(k: K, v: PatientProfile[K]) => setP({ ...p, [k]: v });

  async function save() {
    if (!p) return;
    setBusy(true); setError(null);
    try {
      await api.patchPatientProfile({
        gender: p.gender ?? undefined, county: (p.county ?? undefined) as never, town: p.town ?? undefined, addressLine: p.addressLine ?? undefined, bloodGroup: p.bloodGroup ?? undefined,
        allergies: list(allergies), chronicConditions: list(conditions),
        emergencyContactName: p.emergencyContactName ?? undefined, emergencyContactPhone: p.emergencyContactPhone ?? undefined,
      } as never);
      router.back();
    } catch (e) { setError(errorMessage(e, "Couldn't save.")); } finally { setBusy(false); }
  }
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="My profile" Icon={UserIcon} title="Personal details" />
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 18, gap: 14 }}>
        <Select label="Gender" value={p.gender ?? ""} options={GENDERS} onChange={(v) => set("gender", v)} />
        <Field label="Blood group" value={p.bloodGroup ?? ""} onChangeText={(v) => set("bloodGroup", v)} placeholder="e.g. O+" />
        <Select label="County" value={p.county ?? ""} options={counties} onChange={(v) => set("county", v)} />
        <Field label="Town" value={p.town ?? ""} onChangeText={(v) => set("town", v)} />
        <Field label="Address" value={p.addressLine ?? ""} onChangeText={(v) => set("addressLine", v)} />
        <Field label="Allergies (comma-separated)" value={allergies} onChangeText={setAllergies} />
        <Field label="Chronic conditions (comma-separated)" value={conditions} onChangeText={setConditions} />
        <Field label="Emergency contact name" value={p.emergencyContactName ?? ""} onChangeText={(v) => set("emergencyContactName", v)} />
        <PhoneField label="Emergency contact phone" value={p.emergencyContactPhone ?? ""} onChange={(v) => set("emergencyContactPhone", v)} />
        {error && <Banner tone="danger">{error}</Banner>}
        <Button title="Save changes" onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}

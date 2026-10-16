import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Home } from "lucide-react-native";
import { KENYA_COUNTIES } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import { DateTimeField } from "@/ui/DateTimeField";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { SignInPrompt } from "@/features/SignInPrompt";
import { PageHeader } from "@/ui/PageHeader";

const SPECIALTIES = [
  { value: "nurse", label: "Nurse — home-based care" }, { value: "physio", label: "Physiotherapist — home session" }, { value: "doctor", label: "Doctor — home consultation" },
] as const;
const SPECIALTY_HINT = {
  nurse: "Wound care, injections, elderly & post-op nursing at home.",
  physio: "Rehabilitation and mobility sessions in the comfort of your home.",
  doctor: "A doctor comes to you for an in-person assessment.",
};
const URGENCY = [
  { value: "routine", label: "Routine — within a few days" }, { value: "urgent", label: "Urgent — same day" }, { value: "emergency", label: "Emergency — as soon as possible" },
] as const;

export default function NewHomeVisit() {
  const { user } = useAuth();
  const [specialty, setSpecialty] = useState<"nurse" | "physio" | "doctor">("nurse");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("routine");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [county, setCounty] = useState("");
  const [when, setWhen] = useState<Date | null>(null);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);

  if (!user) return <Screen><SignInPrompt icon="home-outline" title="Sign in to request a visit" hint="We match you to a nurse, physio or doctor near you." /></Screen>;
  const ready = description.trim().length >= 10 && address.trim().length >= 5 && county && phone.length >= 12;

  async function submit() {
    setBusy(true); setError(null);
    try {
      await api.requestHomeVisit({ specialty, urgency, description, address, county, contactPhone: phone, ...(when ? { scheduledAt: when.toISOString() } : {}) } as never);
      router.replace("/home-visits");
    } catch (err) { setError(errorMessage(err, "Failed to submit request.")); }
    finally { setBusy(false); }
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Home-based care" Icon={Home} title="New home visit request" />
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 18, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Select label="Specialist type" value={specialty} options={[...SPECIALTIES]} onChange={setSpecialty} />
          <Text variant="caption" tone="faint">{SPECIALTY_HINT[specialty]}</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Select label="Urgency" value={urgency} options={[...URGENCY]} onChange={setUrgency} />
          {urgency === "emergency" && <Text variant="caption" tone="danger">For life-threatening emergencies, call 999 / 112 first.</Text>}
        </View>
        <Field label="Describe your needs" value={description} onChangeText={setDescription} multiline placeholder="Describe your symptoms or what care you need…" style={{ minHeight: 90, textAlignVertical: "top", paddingTop: 12 }} />
        <Field label="Full address" value={address} onChangeText={setAddress} placeholder="e.g. House 12, Maple Avenue, Westlands" />
        <Select label="County" value={county} options={counties} onChange={setCounty} placeholder="Choose your county" />
        <DateTimeField label="Preferred date & time (optional)" value={when} onChange={setWhen} minimumDate={new Date()} />
        <PhoneField label="Contact phone" value={phone} onChange={setPhone} hint="The nurse or doctor visiting you will call this number." />
        {error && <Banner tone="danger">{error}</Banner>}
        <Button title="Submit request" onPress={submit} loading={busy} disabled={!ready} />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

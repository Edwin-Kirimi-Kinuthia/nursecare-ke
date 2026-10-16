import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { CheckCircle2, Stethoscope } from "lucide-react-native";
import { EMPTY_NAME, composeFullName, type NameParts, type ProviderApplicationInput } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { pickImageDataUrl } from "@/lib/pickImage";
import { pickDocumentDataUrl } from "@/lib/pickFile";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FilePickRow } from "@/ui/FilePickRow";
import { NameFields } from "@/ui/NameFields";
import { PasswordChecklist } from "@/ui/PasswordStrength";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

const ROLES = [
  { value: "doctor", label: "Doctor" }, { value: "nurse", label: "Nurse" }, { value: "physio", label: "Physiotherapist" }, { value: "pharmacy", label: "Pharmacy" },
] as const;

export default function ProviderApply() {
  const { adoptSession } = useAuth();
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [role, setRole] = useState<ProviderApplicationInput["role"]>("doctor");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState(""); const [years, setYears] = useState("");
  const [licenceNumber, setLicenceNumber] = useState(""); const [licenceBody, setLicenceBody] = useState(""); const [qualifications, setQualifications] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [licence, setLicence] = useState<{ dataUrl: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);

  async function photo() { setError(null); try { const r = await pickImageDataUrl({ width: 480 }); if (r) setAvatar(r.dataUrl); } catch (e) { setError(errorMessage(e)); } }
  async function licenceFile() { setError(null); try { const r = await pickDocumentDataUrl(); if (r) setLicence(r); } catch (e) { setError(errorMessage(e)); } }

  async function submit() {
    setError(null);
    if (!avatar) return setError("Please add a passport photo.");
    if (!licence) return setError("Please upload your practice licence.");
    setBusy(true);
    try {
      const res = await api.applyAsProvider({
        fullName: composeFullName(name), email: email.trim().toLowerCase(), phone: phone || undefined, password, role,
        specialty, licenceNumber, licenceBody: licenceBody || undefined, yearsExperience: years ? Number(years) : undefined,
        qualifications: qualifications || undefined, avatarUrl: avatar, licenceDocumentUrl: licence.dataUrl,
      });
      await adoptSession(res);
      setDone(true);
    } catch (e) { setError(errorMessage(e, "Could not submit your application.")); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <Screen>
        <View style={{ alignItems: "center", gap: 10, paddingTop: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={28} color="#047857" /></View>
          <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 24 }}>Application submitted</Text>
          <Text tone="muted" style={{ textAlign: "center" }}>Thanks for applying to Care Bora. Our team will review your licence and get back to you. Your profile is pending verification and won&apos;t be publicly listed until approved.</Text>
        </View>
        <Button title="Go to my profile" onPress={() => router.replace("/account")} />
        <Button title="Home" variant="secondary" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  const ready = name.firstName.trim() && name.surname.trim() && email.includes("@") && password.length >= 8 && specialty.trim() && licenceNumber.trim();
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Providers" Icon={Stethoscope} title="Join as a healthcare provider" lede="Apply to offer consultations, home visits, and care on Care Bora." />
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 18, gap: 14 }}>
        <NameFields value={name} onChange={setName} showTitle />
        <Select label="Profession" value={role} options={[...ROLES]} onChange={setRole} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <PhoneField label="Phone (optional)" value={phone} onChange={setPhone} />
        <Field label="Password" value={password} onChangeText={setPassword} secure autoComplete="new-password" />
        <PasswordChecklist value={password} />
        <Field label="Specialty" value={specialty} onChangeText={setSpecialty} placeholder="e.g. General Practice" />
        <Field label="Years of experience" value={years} onChangeText={(v) => setYears(v.replace(/\D/g, ""))} keyboardType="number-pad" />
        <Field label="Licence number" value={licenceNumber} onChangeText={setLicenceNumber} placeholder="e.g. MD-2015-001" />
        <Field label="Licence body (optional)" value={licenceBody} onChangeText={setLicenceBody} placeholder="e.g. KMPDC" />
        <Field label="Qualifications (optional)" value={qualifications} onChangeText={setQualifications} multiline placeholder="e.g. MBChB – University of Nairobi" style={{ minHeight: 64, textAlignVertical: "top", paddingTop: 12 }} />
        <FilePickRow label="Passport photo" kind="photo" chosen={!!avatar} preview={avatar} name="Photo selected — change" onPress={photo} />
        <FilePickRow label="Practice licence" chosen={!!licence} name={licence?.name} onPress={licenceFile} />
        {error && <Banner tone="danger">{error}</Banner>}
        <Button title="Submit application" onPress={submit} loading={busy} disabled={!ready} />
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>Your details go to our verification team. You&apos;ll be listed publicly only once approved.</Text>
      </View>
    </Screen>
  );
}

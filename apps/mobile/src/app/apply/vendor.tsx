import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Building2, CheckCircle2, LocateFixed } from "lucide-react-native";
import { EMPTY_NAME, KENYA_COUNTIES, composeFullName, type NameParts, type VendorApplicationInput } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { NameFields } from "@/ui/NameFields";
import { PasswordChecklist } from "@/ui/PasswordStrength";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

const ORG_TYPES = [{ value: "pharmacy", label: "Pharmacy" }, { value: "ambulance", label: "Ambulance operator" }, { value: "lab", label: "Diagnostic lab" }] as const;
const num = (v: string) => v.replace(/[^\d.-]/g, "");

export default function VendorApply() {
  const { adoptSession } = useAuth();
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [orgType, setOrgType] = useState<VendorApplicationInput["orgType"]>("pharmacy");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState(""); const [licenceNumber, setLicenceNumber] = useState(""); const [licenceBody, setLicenceBody] = useState("");
  const [kraPin, setKraPin] = useState(""); const [description, setDescription] = useState("");
  const [branchName, setBranchName] = useState(""); const [county, setCounty] = useState<string>("Nairobi"); const [town, setTown] = useState(""); const [addressLine, setAddressLine] = useState("");
  const [lat, setLat] = useState("-1.286389"); const [lng, setLng] = useState("36.817223");
  const [radiusKm, setRadiusKm] = useState("10"); const [deliveryFee, setDeliveryFee] = useState("0"); const [minOrder, setMinOrder] = useState("0");
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);

  async function locate() {
    setLocating(true); setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error("Allow location access to use your position, or type the coordinates.");
      const pos = await Location.getCurrentPositionAsync({});
      setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude));
    } catch (e) { setError(errorMessage(e, "Couldn't get your location.")); } finally { setLocating(false); }
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await api.applyAsVendor({
        fullName: composeFullName(name), email: email.trim().toLowerCase(), phone: phone || undefined, password,
        orgType, orgName, description: description || undefined, licenceNumber, licenceBody: licenceBody || undefined, kraPin: kraPin || undefined,
        branch: {
          name: branchName, county: county as VendorApplicationInput["branch"]["county"], town: town || undefined, addressLine: addressLine || undefined,
          latitude: Number(lat), longitude: Number(lng), deliveryRadiusKm: Number(radiusKm) || 10, deliveryFeeKes: Number(deliveryFee) || 0, minOrderKes: Number(minOrder) || 0,
          isOpen24h: false,
        },
      } as VendorApplicationInput);
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
          <Text tone="muted" style={{ textAlign: "center" }}>Thanks for applying to sell on CareBora. Our team will review your licence and get back to you. Your business is pending review and won&apos;t appear to buyers until approved.</Text>
        </View>
        <Button title="Go to my dashboard" onPress={() => router.replace("/vendor")} />
        <Button title="Home" variant="secondary" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  const ready = name.firstName.trim() && name.surname.trim() && email.includes("@") && password.length >= 8 && orgName.trim() && licenceNumber.trim() && branchName.trim() && !isNaN(Number(lat)) && !isNaN(Number(lng));
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Vendors" Icon={Building2} title="Sell on CareBora" lede="Register your pharmacy, ambulance service, or lab as a vendor." />
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 18, gap: 14 }}>
        <NameFields value={name} onChange={setName} />
        <Select label="Business type" value={orgType} options={[...ORG_TYPES]} onChange={setOrgType} />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <PhoneField label="Phone (optional)" value={phone} onChange={setPhone} />
        <Field label="Password" value={password} onChangeText={setPassword} secure autoComplete="new-password" />
        <PasswordChecklist value={password} />
        <Field label="Business name" value={orgName} onChangeText={setOrgName} placeholder="e.g. Wellcare Pharmacy" />
        <Field label="Licence number" value={licenceNumber} onChangeText={setLicenceNumber} placeholder="e.g. PPB-2020-1123" />
        <Field label="Licence body (optional)" value={licenceBody} onChangeText={setLicenceBody} placeholder="e.g. PPB" />
        <Field label="KRA PIN (optional)" value={kraPin} onChangeText={setKraPin} autoCapitalize="characters" />
        <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline style={{ minHeight: 64, textAlignVertical: "top", paddingTop: 12 }} />
        <View style={{ borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14, gap: 14 }}>
          <View><Text style={{ fontFamily: "Inter_700Bold" }}>First branch / location</Text><Text variant="caption" tone="faint">Buyers near this location will see you first.</Text></View>
          <Field label="Branch name" value={branchName} onChangeText={setBranchName} placeholder="e.g. CBD Branch" />
          <Select label="County" value={county} options={counties} onChange={setCounty} />
          <Field label="Town (optional)" value={town} onChangeText={setTown} />
          <Field label="Address line (optional)" value={addressLine} onChangeText={setAddressLine} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Latitude" value={lat} onChangeText={(v) => setLat(num(v))} keyboardType="numbers-and-punctuation" /></View>
            <View style={{ flex: 1 }}><Field label="Longitude" value={lng} onChangeText={(v) => setLng(num(v))} keyboardType="numbers-and-punctuation" /></View>
          </View>
          <Button title="Use my location" variant="secondary" size="sm" loading={locating} icon={<LocateFixed size={16} color="#0F172A" />} onPress={locate} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Radius (km)" value={radiusKm} onChangeText={(v) => setRadiusKm(num(v))} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Delivery fee" value={deliveryFee} onChangeText={(v) => setDeliveryFee(num(v))} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Min. order" value={minOrder} onChangeText={(v) => setMinOrder(num(v))} keyboardType="number-pad" /></View>
          </View>
        </View>
        {error && <Banner tone="danger">{error}</Banner>}
        <Button title="Submit application" onPress={submit} loading={busy} disabled={!ready} />
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>Your details go to our verification team. You&apos;ll appear to buyers only once approved.</Text>
      </View>
    </Screen>
  );
}

import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { EMPTY_NAME, composeFullName, passwordMeetsRules, type NameParts } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/useAsync";
import { openSite } from "@/lib/links";
import { Screen } from "@/ui/Screen";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { NameFields } from "@/ui/NameFields";
import { PhoneField } from "@/ui/PhoneField";
import { PasswordChecklist } from "@/ui/PasswordStrength";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState<NameParts>({ ...EMPTY_NAME });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = name.firstName.trim() && name.surname.trim() && email.includes("@") && passwordMeetsRules(password);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await register({
        fullName: composeFullName({ ...name, title: "" }),
        email: email.trim().toLowerCase(),
        password,
        role: "patient",
        ...(phone ? { phone } : {}),
      });
      // Signed in now; ask them to confirm the email (they can skip it).
      router.replace("/verify-email");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="title">Create your account</Text>
        <Text tone="muted">See a licensed doctor from your phone and pay with M-Pesa.</Text>
      </View>
      {error && <Banner tone="danger">{error}</Banner>}
      <NameFields value={name} onChange={setName} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <PhoneField label="Phone (optional)" value={phone} onChange={setPhone} />
      <View style={{ gap: 8 }}>
        <Field label="Password" value={password} onChangeText={setPassword} secure autoComplete="new-password" textContentType="newPassword" />
        <PasswordChecklist value={password} />
      </View>
      <Button title="Create account" onPress={submit} loading={busy} disabled={!ready} />
      <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
        By creating an account you agree to our{" "}
        <Text variant="caption" tone="primary" onPress={() => openSite("/privacy")} style={{ textDecorationLine: "underline" }}>privacy policy</Text>.
      </Text>
      <Button title="I already have an account" variant="ghost" onPress={() => router.replace("/login")} />
    </Screen>
  );
}

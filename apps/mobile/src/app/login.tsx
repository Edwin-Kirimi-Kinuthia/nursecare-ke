import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";

export default function LoginScreen() {
  const { beginSignIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await beginSignIn(email, password);
      router.push({ pathname: "/otp", params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="title">Welcome back</Text>
        <Text tone="muted">Sign in to see your appointments and join your consultations.</Text>
      </View>
      {error && <Banner tone="danger">{error}</Banner>}
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} secure autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      <Button title="Continue" onPress={submit} loading={busy} disabled={!email.includes("@") || !password} />
      <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
        We&apos;ll email you a 6-digit code to finish signing in.
      </Text>
      <Button title="Forgot your password?" variant="ghost" onPress={() => router.push("/forgot")} />
      <Button title="Create an account" variant="secondary" onPress={() => router.replace("/register")} />
    </Screen>
  );
}

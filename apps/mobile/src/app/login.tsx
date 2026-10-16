import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/useAsync";
import { AuthShell } from "@/ui/AuthShell";
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
    <AuthShell title="Welcome back" subtitle="Sign in to see your appointments and join your consultations.">
      {error && <Banner tone="danger">{error}</Banner>}
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} secure autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      <Button title="Log in" onPress={submit} loading={busy} disabled={!email.includes("@") || !password} />
      <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
        We&apos;ll email you a 6-digit code to finish signing in.
      </Text>
      <Text onPress={() => router.push("/forgot")} accessibilityRole="link" style={{ color: "#0D9488", fontFamily: "Inter_600SemiBold", textAlign: "center" }}>Forgot password?</Text>
      <Text tone="muted" style={{ textAlign: "center" }}>
        New to CareBora?{" "}
        <Text onPress={() => router.replace("/register")} accessibilityRole="link" style={{ color: "#0D9488", fontFamily: "Inter_600SemiBold" }}>Sign up</Text>
      </Text>
    </AuthShell>
  );
}

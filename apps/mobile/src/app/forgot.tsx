import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";

export default function ForgotScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="title">Reset your password</Text>
        <Text tone="muted">Enter your email and we&apos;ll send you a link to choose a new one.</Text>
      </View>
      {sent ? (
        <>
          <Banner tone="ok">
            If there&apos;s an account for {email.trim()}, a reset link is on its way. Open it on this phone and follow the steps, then come back and sign in.
          </Banner>
          <Button title="Back to sign in" onPress={() => router.back()} />
        </>
      ) : (
        <>
          {error && <Banner tone="danger">{error}</Banner>}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
          <Button title="Send reset link" onPress={submit} loading={busy} disabled={!email.includes("@")} />
        </>
      )}
    </Screen>
  );
}

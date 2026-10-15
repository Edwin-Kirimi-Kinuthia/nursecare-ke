import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";

export default function VerifyEmailScreen() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));

  async function verify(value: string) {
    setBusy(true);
    setError(null);
    try {
      await api.verifyEmail({ code: value });
      await refreshUser();
      done();
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try { await api.resendVerification(); setNotice("We sent a new code."); }
    catch (err) { setError(errorMessage(err)); }
  }

  if (user?.emailVerified) return <Screen><Banner tone="ok">Your email is verified.</Banner><Button title="Done" onPress={done} /></Screen>;

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="title">Verify your email</Text>
        <Text tone="muted">We sent a 6-digit code to {user?.email}. Enter it so we can reach you about your appointments.</Text>
      </View>
      {error && <Banner tone="danger">{error}</Banner>}
      {notice && !error && <Banner tone="ok">{notice}</Banner>}
      <Field
        label="6-digit code" value={code} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} autoFocus
        onChangeText={(v) => { const d = v.replace(/\D/g, "").slice(0, 6); setCode(d); if (d.length === 6) void verify(d); }}
        style={{ letterSpacing: 8, fontSize: 24, textAlign: "center" }}
      />
      <Button title="Verify" onPress={() => verify(code)} loading={busy} disabled={code.length !== 6} />
      <Button title="Send a new code" variant="ghost" onPress={resend} />
      <Button title="Skip for now" variant="ghost" onPress={done} />
    </Screen>
  );
}

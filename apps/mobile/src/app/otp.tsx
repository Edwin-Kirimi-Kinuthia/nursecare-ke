import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { AuthShell } from "@/ui/AuthShell";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Banner } from "@/ui/parts";

export default function OtpScreen() {
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const { completeSignIn } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function verify(value: string) {
    setBusy(true);
    setError(null);
    try {
      await completeSignIn(email, value);
      // The signed-out screens are now protected, so the router moves us on by itself.
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api.resendLoginOtp({ email });
      setNotice("We sent a new code.");
      setCooldown(30);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <AuthShell title="Check your email" subtitle={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}>
      {error && <Banner tone="danger">{error}</Banner>}
      {notice && !error && <Banner tone="ok">{notice}</Banner>}
      <Field
        label="6-digit code"
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          if (digits.length === 6) void verify(digits); // submit as soon as it's complete
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        style={{ letterSpacing: 8, fontSize: 24, textAlign: "center" }}
      />
      <Button title="Verify and sign in" onPress={() => verify(code)} loading={busy} disabled={code.length !== 6} />
      <Button title={cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"} variant="ghost" onPress={resend} disabled={cooldown > 0} />
      <Button title="Use a different account" variant="ghost" onPress={() => router.back()} />
    </AuthShell>
  );
}

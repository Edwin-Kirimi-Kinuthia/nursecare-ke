import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { KeyRound } from "lucide-react-native";
import { passwordMeetsRules } from "@carebora/shared";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { PasswordChecklist } from "@/ui/PasswordStrength";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

/** Two steps, as on the website: current password → emailed code + new password. */
export default function ChangePassword() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);

  async function request() {
    setBusy(true); setError(null);
    try { await api.requestChangePassword({ currentPassword: current }); setStep("otp"); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError(null);
    try { await api.confirmChangePassword({ code, newPassword: next }); router.back(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(null); setNotice(null);
    try { await api.requestChangePassword({ currentPassword: current }); setNotice("Code resent — check your inbox."); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="My profile" Icon={KeyRound} title="Change password" />
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 18, gap: 14 }}>
        {step === "form" ? (
          <>
            <Field label="Current password" value={current} onChangeText={setCurrent} secure autoComplete="current-password" />
            <Field label="New password" value={next} onChangeText={setNext} secure autoComplete="new-password" />
            <PasswordChecklist value={next} />
            {error && <Banner tone="danger">{error}</Banner>}
            <Button title="Send confirmation code" onPress={request} loading={busy} disabled={!current || !passwordMeetsRules(next)} />
          </>
        ) : (
          <>
            <Text tone="muted">We emailed you a 6-digit code to confirm this change. Enter it below.</Text>
            <Field label="Confirmation code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="123456" />
            {error && <Banner tone="danger">{error}</Banner>}
            {notice && !error && <Banner tone="ok">{notice}</Banner>}
            <Button title="Confirm password change" onPress={confirm} loading={busy} disabled={code.length !== 6} />
            <Button title="Resend code" variant="ghost" onPress={resend} disabled={busy} />
            <Button title="Back" variant="ghost" onPress={() => { setStep("form"); setError(null); setNotice(null); }} />
          </>
        )}
      </View>
    </Screen>
  );
}

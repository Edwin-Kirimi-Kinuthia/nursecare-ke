import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { openSite } from "@/lib/links";
import { Screen, Card } from "@/ui/Screen";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";

/** Required by both app stores. Mirrors what the server does, and says what is kept (the privacy policy promises the same). */
export default function DeleteAccountScreen() {
  const { afterDeletion } = useAuth();
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount({ confirm: "DELETE", ...(password ? { password } : {}) });
      await afterDeletion(); // wipes local tokens; the signed-in screens close behind us
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Text variant="title">Delete your account</Text>
        <Text tone="muted">This is permanent and can&apos;t be undone.</Text>
      </View>
      <Card>
        <Text variant="subheading">Removed straight away</Text>
        <Text tone="muted">Your name, email, phone and photo; your password and sign-ins; your patient profile and the health information you recorded yourself.</Text>
        <Text variant="subheading" style={{ marginTop: 6 }}>Kept without your name</Text>
        <Text tone="muted">Clinical notes, prescriptions, lab results, and appointment and payment records. Kenyan law requires these to be kept for a set period, then they are deleted.</Text>
        <Text variant="subheading" style={{ marginTop: 6 }}>Also</Text>
        <Text tone="muted">Upcoming appointments are cancelled and the other person is told. We email you to confirm.</Text>
        <Button title="Read more" variant="ghost" size="sm" onPress={() => openSite("/delete-account")} />
      </Card>
      {error && <Banner tone="danger">{error}</Banner>}
      <Field label="Your password" value={password} onChangeText={setPassword} secure autoComplete="current-password" />
      <Field label="Type DELETE to confirm" value={phrase} onChangeText={setPhrase} autoCapitalize="characters" autoCorrect={false} />
      <Button title="Delete my account permanently" variant="danger" onPress={remove} loading={busy} disabled={phrase !== "DELETE"} />
      <Button title="Keep my account" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

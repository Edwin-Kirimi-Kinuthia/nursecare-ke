import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { PROVIDER_ROLES, providerMeetingSchema } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { DateTimeField } from "@/ui/DateTimeField";
import { Select } from "@/ui/Select";
import { Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

export default function ScheduleMeetingScreen() {
  const { clientEmail } = useLocalSearchParams<{ clientEmail?: string }>();
  const { user } = useAuth();
  const [email, setEmail] = useState(clientEmail ?? "");
  const [timing, setTiming] = useState<"now" | "later">("now");
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [duration, setDuration] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (!user || !PROVIDER_ROLES.includes(user.role)) {
    return <Screen><Banner tone="danger">Only care providers can schedule client meetings.</Banner></Screen>;
  }

  async function submit() {
    setError(null);
    if (!createdId && timing === "later" && (!startsAt || startsAt <= new Date())) {
      setError("Choose a future date and time.");
      return;
    }
    setBusy(true);
    let appointmentId = createdId;
    try {
      if (!appointmentId) {
        const input = providerMeetingSchema.parse({
          clientEmail: email, durationMinutes: Number(duration),
          ...(timing === "later" ? { startsAt: startsAt!.toISOString() } : {}),
        });
        const appointment = await api.scheduleProviderMeeting(input);
        appointmentId = appointment.id;
        setCreatedId(appointmentId);
      }
      if (timing === "now") {
        const consultation = await api.startConsultation(appointmentId);
        router.replace({ pathname: "/consultation/[id]", params: { id: consultation.id, appointmentId } });
      } else {
        router.replace({ pathname: "/appointment/[id]", params: { id: appointmentId } });
      }
    } catch (err) {
      const validation = providerMeetingSchema.safeParse({ clientEmail: email, durationMinutes: Number(duration) });
      setError(appointmentId ? "The meeting was scheduled. Try starting it again, or open it in your appointments." : validation.success ? errorMessage(err) : validation.error.issues[0].message);
    } finally { setBusy(false); }
  }

  return (
    <Screen>
      <PageHeader title="Schedule a meeting" lede="Invite any registered client, now or at a time you choose." />
      <Banner tone="ok">Free for the client. Automatically confirmed, with no payment required.</Banner>
      <Field label="Client email" hint="Use the email they registered with." value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!createdId} />
      {!createdId && <Select label="When" value={timing} options={[{ value: "now", label: "Meet now" }, { value: "later", label: "Schedule for later" }]} onChange={setTiming} />}
      {timing === "later" && <DateTimeField label="Date and time (your local time)" value={startsAt} onChange={setStartsAt} minimumDate={new Date()} />}
      <Field label="Duration (minutes)" hint="5 to 240 minutes" value={duration} onChangeText={setDuration} keyboardType="number-pad" editable={!createdId} />
      {error && <Banner tone="danger">{error}</Banner>}
      <Button title={createdId ? "Start scheduled meeting" : timing === "now" ? "Invite and start meeting" : "Schedule meeting"} onPress={submit} loading={busy} />
      <Button title="Back to appointments" variant="ghost" onPress={() => router.replace("/(tabs)/appointments")} disabled={busy} />
    </Screen>
  );
}

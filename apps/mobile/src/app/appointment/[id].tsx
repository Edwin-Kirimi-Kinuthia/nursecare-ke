import { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Appointment } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { dayLabel, kes, timeOnly } from "@/lib/format";
import { describeAppointment } from "@/features/appointmentStatus";
import { MpesaPay } from "@/features/MpesaPay";
import { ReviewForm } from "@/features/ReviewForm";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Avatar, Badge, Banner, Empty, Loading, Stars } from "@/ui/parts";

export default function AppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appt = useAsync(() => api.getAppointment(id), [id]);

  // While a consultation is under way, notice when the other side starts it.
  const live = appt.data?.status === "confirmed";
  const reload = useRef(appt.reload);
  useEffect(() => { reload.current = appt.reload; }, [appt.reload]);
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void reload.current(), 8000);
    return () => clearInterval(timer);
  }, [live]);

  if (!user) return null;
  if (appt.loading && !appt.data) return <Loading />;
  if (appt.error || !appt.data) {
    return <Screen><Empty icon="alert-circle-outline" title="Couldn't load this appointment" hint={appt.error ?? undefined} action={{ label: "Try again", onPress: () => void appt.reload() }} /></Screen>;
  }

  const a: Appointment = appt.data;
  const isProvider = a.providerId === user.id;
  const other = isProvider ? a.patient : a.provider.user;
  const status = describeAppointment(a, user.id);
  const paid = a.payment?.status === "completed" || a.feeKes <= 0;
  const consultation = a.consultation && a.consultation.status !== "ended" ? a.consultation : null;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); await appt.reload(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }

  const confirm = () => run(async () => { await api.patchAppointment(a.id, { status: "confirmed" }); });

  const startOrJoin = () => run(async () => {
    const c = consultation ?? (await api.startConsultation(a.id));
    router.push({ pathname: "/consultation/[id]", params: { id: c.id, appointmentId: a.id } });
  });

  const cancel = () =>
    Alert.alert("Cancel this appointment?", "The time goes back to the doctor's calendar.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel appointment", style: "destructive", onPress: () => void run(async () => { await api.patchAppointment(a.id, { status: "cancelled" }); }) },
    ]);

  return (
    <Screen onRefresh={appt.reload} refreshing={appt.refreshing}>
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Avatar name={other.fullName} uri={other.avatarUrl} size={60} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="heading">{other.fullName}</Text>
            <Text tone="muted">{isProvider ? "Patient" : a.provider.specialty ?? "Consultation"}</Text>
            <View style={{ flexDirection: "row" }}><Badge label={status.label} tone={status.tone} /></View>
          </View>
        </View>
        <View style={{ gap: 4, marginTop: 6 }}>
          <Row label="Date" value={dayLabel(a.slot.startsAt)} />
          <Row label="Time" value={`${timeOnly(a.slot.startsAt)} – ${timeOnly(a.slot.endsAt)}`} />
          <Row label="Type" value="Video consultation" />
          <Row label="Fee" value={kes(a.feeKes)} />
          {a.payment?.receiptNumber ? <Row label="M-Pesa receipt" value={a.payment.receiptNumber} /> : null}
        </View>
      </Card>

      {error && <Banner tone="danger">{error}</Banner>}

      {/* ── patient ─────────────────────────────────────────────── */}
      {!isProvider && a.status === "requested" && (
        <Banner tone="warn">Waiting for {a.provider.user.fullName} to confirm. You&apos;ll be notified, and can pay once they do.</Banner>
      )}
      {!isProvider && a.status === "confirmed" && !paid && (
        <MpesaPay appointmentId={a.id} amountKes={a.feeKes} defaultPhone={user.phone} onPaid={() => void appt.reload()} />
      )}
      {!isProvider && a.status === "confirmed" && paid && !consultation && (
        <Banner tone="ok">You&apos;re all set. {a.provider.user.fullName} will start your consultation at your time, and we&apos;ll notify you.</Banner>
      )}
      {!isProvider && consultation && (
        <Button title="Join video consultation" onPress={startOrJoin} loading={busy} />
      )}
      {!isProvider && a.status === "completed" && (
        a.review ? (
          <Card>
            <Text variant="subheading">Your review</Text>
            <Stars value={a.review.rating} size={20} />
            {a.review.comment ? <Text tone="muted">{a.review.comment}</Text> : null}
          </Card>
        ) : (
          <ReviewForm appointmentId={a.id} providerName={a.provider.user.fullName} onDone={() => void appt.reload()} />
        )
      )}
      {!isProvider && ["requested", "confirmed"].includes(a.status) && !paid && !consultation && (
        <Button title="Cancel appointment" variant="ghost" onPress={cancel} disabled={busy} />
      )}
      {!isProvider && paid && a.feeKes > 0 && ["confirmed"].includes(a.status) && (
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
          Need to cancel a paid appointment? Message us from the Account tab and we&apos;ll arrange a refund.
        </Text>
      )}

      {/* ── doctor ──────────────────────────────────────────────── */}
      {isProvider && a.status === "requested" && (
        <Button title="Confirm this appointment" onPress={confirm} loading={busy} />
      )}
      {isProvider && a.status === "confirmed" && !paid && (
        <Banner tone="warn">Waiting for the patient to pay. You can start once the fee has been paid.</Banner>
      )}
      {isProvider && a.status === "confirmed" && paid && (
        <Button title={consultation ? "Rejoin consultation" : "Start consultation"} onPress={startOrJoin} loading={busy} />
      )}
      {isProvider && a.status === "completed" && a.review && (
        <Card>
          <Text variant="subheading">Patient review</Text>
          <Stars value={a.review.rating} size={20} />
          {a.review.comment ? <Text tone="muted">{a.review.comment}</Text> : null}
        </Card>
      )}
      {isProvider && (a.patientNotes) ? (
        <Card><Text variant="label" tone="muted">NOTE FROM THE PATIENT</Text><Text>{a.patientNotes}</Text></Card>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text tone="muted">{label}</Text>
      <Text style={{ fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { Appointment } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { describeAppointment } from "@/features/appointmentStatus";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen, Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Avatar, Badge, Banner, Empty, Loading } from "@/ui/parts";

export default function AppointmentsScreen() {
  const { user } = useAuth();

  // Split into upcoming and past inside the fetch, where reading the clock is
  // fine; doing it during render would make the screen's output depend on when
  // it happened to render.
  const list = useAsync(async () => {
    if (!user) return { upcoming: [] as Appointment[], past: [] as Appointment[] };
    const { appointments } = await api.listAppointments({ limit: 50 });
    const now = Date.now();
    const isUpcoming = (a: Appointment) => ["requested", "confirmed"].includes(a.status) && new Date(a.slot.endsAt).getTime() > now;
    return {
      upcoming: appointments.filter(isUpcoming).sort((a, b) => +new Date(a.slot.startsAt) - +new Date(b.slot.startsAt)),
      past: appointments.filter((a) => !isUpcoming(a)).sort((a, b) => +new Date(b.slot.startsAt) - +new Date(a.slot.startsAt)),
    };
  }, [user?.id]);

  if (!user) {
    return (
      <Screen>
        <SignInPrompt icon="calendar-outline" title="Your appointments" hint="Sign in to see your bookings, pay for a consultation and join your video call." />
      </Screen>
    );
  }

  const upcoming = list.data?.upcoming ?? [];
  const past = list.data?.past ?? [];
  const total = upcoming.length + past.length;

  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing}>
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? (
        <View style={{ height: 240 }}><Loading /></View>
      ) : total === 0 ? (
        <Empty icon="calendar-outline" title="No appointments yet" hint="Book a consultation and it will appear here." action={{ label: "Find a doctor", onPress: () => router.push("/doctors") }} />
      ) : (
        <>
          {upcoming.length > 0 && <Text variant="label" tone="muted">UPCOMING</Text>}
          {upcoming.map((a) => <AppointmentCard key={a.id} a={a} meId={user.id} />)}
          {past.length > 0 && <Text variant="label" tone="muted" style={{ marginTop: 8 }}>PAST</Text>}
          {past.map((a) => <AppointmentCard key={a.id} a={a} meId={user.id} />)}
        </>
      )}
    </Screen>
  );
}

function AppointmentCard({ a, meId }: { a: Appointment; meId: string }) {
  const isProvider = a.providerId === meId;
  const name = isProvider ? a.patient.fullName : a.provider.user.fullName;
  const avatar = isProvider ? a.patient.avatarUrl : a.provider.user.avatarUrl;
  const s = describeAppointment(a, meId);
  return (
    <Pressable onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: a.id } })} accessibilityRole="button" accessibilityLabel={`Appointment with ${name}, ${s.label}`} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Card>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Avatar name={name} uri={avatar} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheading">{name}</Text>
            <Text tone="muted">{dayTime(a.slot.startsAt)}</Text>
            <Text variant="caption" tone="faint">{isProvider ? "Patient" : a.provider.specialty ?? "Consultation"} · {kes(a.feeKes)}</Text>
          </View>
          <Badge label={s.label} tone={s.tone} />
        </View>
      </Card>
    </Pressable>
  );
}

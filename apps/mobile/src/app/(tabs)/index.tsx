import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Appointment } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useContacts } from "@/lib/appConfig";
import { callNumber } from "@/lib/links";
import { usePushPermission } from "@/lib/push";
import { dayTime } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Avatar, Badge, Row } from "@/ui/parts";
import { radius, useTheme } from "@/ui/theme";

export default function HomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { ambulancePhone } = useContacts();
  const push = usePushPermission(!!user);

  const next = useAsync<Appointment | null>(async () => {
    if (!user) return null;
    const { appointments } = await api.listAppointments({ limit: 20 });
    const now = Date.now();
    return appointments
      .filter((a) => ["requested", "confirmed"].includes(a.status) && new Date(a.slot.endsAt).getTime() > now)
      .sort((a, b) => +new Date(a.slot.startsAt) - +new Date(b.slot.startsAt))[0] ?? null;
  }, [user?.id]);

  const firstName = user ? user.fullName.replace(/^(Dr\.?|Prof\.?|Nurse|Mr\.?|Mrs\.?|Ms\.?|Miss)\s+/i, "").split(" ")[0] : null;

  return (
    <Screen onRefresh={next.reload} refreshing={next.refreshing} padTop contentContainerStyle={{ paddingTop: insets.top + 8 }}>
      <View style={{ gap: 4 }}>
        <Text variant="label" tone="primary">Care Bora</Text>
        <Text variant="title">{firstName ? `Hello, ${firstName}` : "How can we help?"}</Text>
      </View>

      {/* Emergencies come first, and need no sign-in. */}
      <View style={{ backgroundColor: t.dangerSoft, borderRadius: radius.lg, padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="medical" size={22} color={t.danger} />
          <Text variant="subheading" style={{ color: t.dangerText, flex: 1 }}>Medical emergency?</Text>
        </View>
        <Text style={{ color: t.dangerText }}>Don&apos;t book a consultation. Call the ambulance line now.</Text>
        <Button variant="danger" title="Call ambulance" icon={<Ionicons name="call" size={18} color="#fff" />} onPress={() => callNumber(ambulancePhone)} />
      </View>

      {/* Explain before the system dialog appears: a prompt with no context gets refused,
          and on iOS a refusal can only be undone in Settings. */}
      {user && push.permission === "undetermined" && (
        <Card>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Ionicons name="notifications-outline" size={22} color={t.primarySoftText} />
            <Text variant="subheading" style={{ flex: 1 }}>Know when your doctor is ready</Text>
          </View>
          <Text tone="muted">Turn on notifications to hear when a doctor confirms your booking or starts your consultation. They never show your health details on the lock screen.</Text>
          <Button title="Turn on notifications" size="sm" onPress={push.enable} />
        </Card>
      )}

      {user && next.data && (
        <Card>
          <Text variant="label" tone="muted">YOUR NEXT APPOINTMENT</Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 4 }}>
            <Avatar name={otherParty(next.data, user.id)} uri={otherAvatar(next.data, user.id)} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="subheading">{otherParty(next.data, user.id)}</Text>
              <Text tone="muted">{dayTime(next.data.slot.startsAt)}</Text>
            </View>
            <Badge label={next.data.status === "confirmed" ? "Confirmed" : "Requested"} tone={next.data.status === "confirmed" ? "ok" : "warn"} />
          </View>
          <Button title="View appointment" variant="secondary" size="sm" onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: next.data!.id } })} />
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="medkit-outline" title="Find a doctor" subtitle="Licence-checked clinicians, fees shown upfront" onPress={() => router.push("/doctors")} />
        <Row icon="calendar-outline" title="My appointments" subtitle="Pay, join your video call, leave a review" onPress={() => router.push("/appointments")} />
        <Row icon="chatbubbles-outline" title="Message us" subtitle="Questions, or request a medical document" onPress={() => router.push("/support/new")} />
        <Row icon="call-outline" title="Ambulance numbers" subtitle="What to say when you call" onPress={() => router.push("/ambulance")} />
      </Card>

      <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
        Care Bora doesn&apos;t replace emergency care or an in-person examination when you need one.
      </Text>
    </Screen>
  );
}

const otherParty = (a: Appointment, me: string) => (a.providerId === me ? a.patient.fullName : a.provider.user.fullName);
const otherAvatar = (a: Appointment, me: string) => (a.providerId === me ? a.patient.avatarUrl : a.provider.user.avatarUrl);

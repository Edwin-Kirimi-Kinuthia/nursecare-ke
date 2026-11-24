import { useRef, useState, type ComponentRef } from "react";
import { Image, type ImageSourcePropType, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ambulance } from "lucide-react-native";
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
import { Avatar, Badge } from "@/ui/parts";
import { Footer } from "@/ui/Footer";
import { gradients, useTheme } from "@/ui/theme";

const FEATURES: { image: ImageSourcePropType; title: string; desc: string; to: string }[] = [
  { image: require("../../../assets/services/consultation.jpg"), title: "Consultations", desc: "Choose a clinician and book a private video appointment.", to: "/doctors" },
  { image: require("../../../assets/services/pharmacy.jpg"), title: "Pharmacy", desc: "Find your medicines and arrange delivery.", to: "/pharmacy" },
  { image: require("../../../assets/services/home-visit.jpg"), title: "Home care", desc: "Arrange a nurse, doctor or physiotherapist visit.", to: "/home-visits" },
  { image: require("../../../assets/services/ambulance.jpg"), title: "Ambulance", desc: "Call for assistance or track an ambulance request.", to: "/ambulance" },
  { image: require("../../../assets/services/laboratory.jpg"), title: "Laboratory tests", desc: "Find a lab and view results in your account.", to: "/labs" },
  { image: require("../../../assets/services/documents.jpg"), title: "Medical documents", desc: "Request reports, sick-off sheets and medical forms.", to: "/support/new" },
];

export default function HomeScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 64, 380);
  const [slide, setSlide] = useState(0);
  const carousel = useRef<ComponentRef<typeof ScrollView>>(null);
  const { user } = useAuth();
  const { ambulancePhone } = useContacts();
  const push = usePushPermission(!!user);

  const next = useAsync<Appointment | null>(async () => {
    if (!user) return null;
    const { appointments } = await api.listAppointments({ limit: 20 });
    const now = Date.now();
    return appointments
      .filter((a) => ["awaiting_payment", "requested", "confirmed"].includes(a.status) && new Date(a.slot.endsAt).getTime() > now)
      .sort((a, b) => +new Date(a.slot.startsAt) - +new Date(b.slot.startsAt))[0] ?? null;
  }, [user?.id]);

  const openFeature = (f: (typeof FEATURES)[number]) => router.navigate(f.to as never);

  return (
    <Screen onRefresh={next.reload} refreshing={next.refreshing} gap={0} contentContainerStyle={{ padding: 0, paddingBottom: 72 }}>
      <LinearGradient colors={gradients.hero} style={{ padding: 24, gap: 12 }}>
        <Text style={{ color: "#99F6E4", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>CARE BORA · HERE FOR YOU</Text>
        <Text style={{ color: "#fff", fontFamily: "Inter_800ExtraBold", fontSize: 32, lineHeight: 39 }}>The care you need.
One place to find it.</Text>
        <Text style={{ color: "#CCFBF1", fontSize: 16, lineHeight: 24 }}>Choose a service below. We&apos;ll help you take the next step.</Text>
      </LinearGradient>
      <View style={{ paddingTop: 24, gap: 12 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between" }}><Text variant="subheading">Our services</Text><Text tone="muted">{slide + 1} / {FEATURES.length}</Text></View>
        <ScrollView ref={carousel} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} onMomentumScrollEnd={e => setSlide(Math.min(FEATURES.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12))))}>
          {FEATURES.map(f => <Pressable key={f.title} accessibilityRole="button" accessibilityLabel={`Open ${f.title}`} onPress={() => openFeature(f)} style={{ width: cardWidth, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 24, padding: 24, gap: 12 }}>
            <Image source={f.image} accessibilityLabel={f.title} style={{ height: 160, width: cardWidth - 48, borderRadius: 16 }} resizeMode="cover" />
            <Text variant="subheading">{f.title}</Text><Text tone="muted" style={{ minHeight: 48 }}>{f.desc}</Text>
            <Text style={{ color: "#0F766E", fontFamily: "Inter_700Bold" }}>Get started →</Text>
          </Pressable>)}
        </ScrollView>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>{FEATURES.map((f, i) => <Pressable key={f.title} accessibilityRole="button" accessibilityLabel={`Show ${f.title}`} accessibilityState={{ selected: slide === i }} hitSlop={10} onPress={() => { carousel.current?.scrollTo({ x: i * (cardWidth + 12), animated: true }); setSlide(i); }} style={{ width: slide === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: slide === i ? "#0F766E" : "#CBD5E1" }} />)}</View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>{FEATURES.map(f => <Pressable key={f.title} onPress={() => openFeature(f)} accessibilityRole="button" style={{ padding: 10, borderRadius: 12, borderWidth: 1, borderColor: t.border }}><Text variant="caption">{f.title} ↗</Text></Pressable>)}</View>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {user && push.permission === "undetermined" && (
          // Explain before the system dialog appears: a prompt with no context gets refused,
          // and on iOS a refusal can only be undone in Settings.
          <Card>
            <Text variant="subheading">Know when your doctor is ready</Text>
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

        {/* Emergencies need no sign-in. */}
        <View style={{ backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3", borderRadius: 24, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" }}>
              <Ambulance size={22} color="#fff" />
            </View>
            <Text style={{ flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22, color: "#881337" }}>Need an ambulance?</Text>
          </View>
          <Text style={{ color: "#BE123C", fontSize: 14, lineHeight: 20 }}>Don&apos;t book a consultation. Call the ambulance line now.</Text>
          <Button variant="danger" title={`Call ${ambulancePhone}`} icon={<Ambulance size={18} color="#fff" />} onPress={() => callNumber(ambulancePhone)} />
        </View>

        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>
          Care Bora doesn&apos;t replace emergency care or an in-person examination when you need one.
        </Text>
        <Footer />
      </View>
    </Screen>
  );
}

const otherParty = (a: Appointment, me: string) => (a.providerId === me ? a.patient.fullName : a.provider.user.fullName);
const otherAvatar = (a: Appointment, me: string) => (a.providerId === me ? a.patient.avatarUrl : a.provider.user.avatarUrl);

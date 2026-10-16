import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Ambulance, FileText, Home as HomeIcon, Pill, ShieldCheck, Siren, Smartphone, Stamp, Users, Video, type LucideIcon } from "lucide-react-native";
import type { Appointment } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useContacts } from "@/lib/appConfig";
import { callNumber, openSite } from "@/lib/links";
import { usePushPermission } from "@/lib/push";
import { dayTime } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Avatar, Badge } from "@/ui/parts";
import { Footer } from "@/ui/Footer";
import { gradients, useTheme } from "@/ui/theme";

const FEATURES: { Icon: LucideIcon; title: string; desc: string; site?: string; to?: string }[] = [
  { Icon: Video, title: "Teleconsultations", desc: "Secure video + chat with verified doctors and nurses.", to: "/doctors" },
  { Icon: Siren, title: "Emergency ambulance", desc: "Call our ambulance line directly, or send a request and follow its status.", to: "/ambulance" },
  { Icon: Stamp, title: "Medical forms & reports", desc: "Request a sick-off sheet, medical report or school, employment or insurance form — a licensed clinician reviews and signs it.", to: "/support/new" },
  { Icon: FileText, title: "Treatment with sick-off sheet", desc: "Get treated online and receive a signed sick-off sheet (medical certificate) for work or school.", to: "/doctors" },
  { Icon: Pill, title: "Pharmacy delivery", desc: "Order medication from the pharmacy nearest you, delivered to your door.", to: "/pharmacy" },
  { Icon: HomeIcon, title: "Home-based care", desc: "Request a nurse or physio to visit you at home.", to: "/home-visits" },
  { Icon: Users, title: "Licence-checked providers", desc: "Every clinician submits their practice licence for review before they appear.", site: "/how-we-verify-providers" },
  { Icon: Smartphone, title: "M-Pesa payments", desc: "Pay for care instantly — no cards, no friction.", to: "/doctors" },
  { Icon: ShieldCheck, title: "Private & secure", desc: "Clinical records protected with strict access controls.", site: "/privacy" },
];
const STEPS = [
  { n: "01", title: "Create an account", desc: "Sign up in seconds as a patient." },
  { n: "02", title: "Find your provider", desc: "Browse licence-checked clinicians and pick an open time." },
  { n: "03", title: "Pay, then see your doctor", desc: "Pay the fee with M-Pesa, then join a private video call at your time." },
];
const STATS = [
  ["Licensed", "Every provider checked"], ["Nationwide", "Video consultations"], ["24/7", "Ambulance dispatch"], ["M-Pesa", "Instant payment"],
];

export default function HomeScreen() {
  const t = useTheme();
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

  const openFeature = (f: (typeof FEATURES)[number]) => (f.site ? void openSite(f.site) : router.navigate(f.to as never));

  return (
    <Screen onRefresh={next.reload} refreshing={next.refreshing} gap={0} contentContainerStyle={{ padding: 0, paddingBottom: 72 }}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingVertical: 48, alignItems: "center", gap: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(94,234,212,0.3)", backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2DD4BF" }} />
          <Text style={{ color: "#CCFBF1", fontFamily: "Inter_500Medium", fontSize: 14 }}>Kenya&apos;s telehealth platform</Text>
        </View>
        <Text style={{ color: "#fff", fontFamily: "Inter_800ExtraBold", fontSize: 40, lineHeight: 42, letterSpacing: -1, textAlign: "center" }}>
          Quality care,{" "}<Text style={{ color: "#99F6E4", fontFamily: "Inter_800ExtraBold", fontSize: 40, lineHeight: 42, letterSpacing: -1 }}>made accessible.</Text>
        </Text>
        <Text style={{ color: "rgba(204,251,241,0.9)", fontSize: 17, lineHeight: 28, textAlign: "center" }}>
          Consult verified doctors and nurses, book home visits, and order from the pharmacy — all paid for with M-Pesa, all in one place.
        </Text>
        <View style={{ alignSelf: "stretch", gap: 12, paddingHorizontal: 24 }}>
          <Button variant="light" title="Find a provider" icon={<ArrowRight size={18} color="#0F766E" />} onPress={() => router.navigate("/doctors")} />
          <Button variant="outlineLight" title="Browse pharmacy" onPress={() => router.navigate("/pharmacy")} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          {STATS.map(([k, v]) => (
            <View key={k} style={{ flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 18, alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#fff", fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>{k}</Text>
              <Text style={{ color: "rgba(153,246,228,0.9)", fontSize: 13, textAlign: "center" }}>{v}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

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
            <Text style={{ flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22, color: "#881337" }}>Medical emergency? An ambulance is ready.</Text>
          </View>
          <Text style={{ color: "#BE123C", fontSize: 14, lineHeight: 20 }}>Don&apos;t book a consultation. Call the ambulance line now.</Text>
          <Button variant="danger" title={`Call ${ambulancePhone}`} icon={<Ambulance size={18} color="#fff" />} onPress={() => callNumber(ambulancePhone)} />
        </View>

        <View style={{ gap: 6, marginTop: 24, alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 28, letterSpacing: -0.5, textAlign: "center" }}>Everything your family needs</Text>
          <Text tone="muted" style={{ textAlign: "center", fontSize: 16 }}>One platform for consultations, care, and medication.</Text>
        </View>
        {FEATURES.map((f) => (
          <Pressable key={f.title} onPress={() => openFeature(f)} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 24, gap: 4 }}>
              <LinearGradient colors={gradients.button} style={{ width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <f.Icon size={22} color="#fff" />
              </LinearGradient>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16 }}>{f.title}</Text>
              <Text tone="muted" style={{ fontSize: 14, lineHeight: 21 }}>{f.desc}</Text>
            </View>
          </Pressable>
        ))}

        <View style={{ backgroundColor: "#fff", marginHorizontal: -16, paddingVertical: 40, paddingHorizontal: 16, gap: 16, marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.border }}>
          <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 28, letterSpacing: -0.5, textAlign: "center", marginBottom: 8 }}>Care in three steps</Text>
          {STEPS.map((s) => (
            <View key={s.n} style={{ gap: 4 }}>
              <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 36, color: "#99F6E4" }}>{s.n}</Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18 }}>{s.title}</Text>
              <Text tone="muted" style={{ fontSize: 14, lineHeight: 21 }}>{s.desc}</Text>
            </View>
          ))}
        </View>

        <LinearGradient colors={gradients.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 32, alignItems: "center", gap: 12, marginTop: 8 }}>
          <Text style={{ color: "#fff", fontFamily: "Inter_800ExtraBold", fontSize: 28, textAlign: "center" }}>Ready to see a doctor?</Text>
          <Button variant="light" title="Find a provider" icon={<ArrowRight size={18} color="#0F766E" />} onPress={() => router.navigate("/doctors")} style={{ alignSelf: "stretch" }} />
        </LinearGradient>

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

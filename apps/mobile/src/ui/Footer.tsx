import { Image, Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ambulance, Mail, MapPin, MessageCircle, MessageSquare, Phone, type LucideIcon } from "lucide-react-native";
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from "@carebora/shared";
import { useContacts } from "@/lib/appConfig";
import { callNumber, emailTo, openSite } from "@/lib/links";
import { Text } from "./Text";
import { useTheme } from "./theme";

function Link({ label, onPress }: { label: string; onPress: () => void }) {
return (
    <Pressable onPress={onPress} accessibilityRole="link" style={{ paddingVertical: 5 }}>
    <Text tone="muted" style={{ fontSize: 14 }}>{label}</Text>
    </Pressable>
);
}
function Line({ Icon, label, onPress }: { Icon: LucideIcon; label: string; onPress: () => void }) {
const t = useTheme();
return (
    <Pressable onPress={onPress} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
    <Icon size={16} color={t.textMuted} />
    <Text tone="muted" style={{ fontSize: 14 }}>{label}</Text>
    </Pressable>
);
}
function Head({ children }: { children: string }) {
return (
    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#334155", marginBottom: 4 }}>{children}</Text>
);
}

/** The website's footer, at the bottom of the main pages. */
export function Footer() {
  const t = useTheme();
  const { ambulancePhone, supportPhones, supportEmail } = useContacts();
  return (
    <View style={{ marginTop: 24, marginHorizontal: -16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: t.border, paddingHorizontal: 20, paddingTop: 28, gap: 24 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={require("../../assets/brand/logo-mark.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 18 }}>Care Bora</Text>
        </View>
        <Text tone="muted" style={{ fontSize: 14, lineHeight: 21 }}>
          Quality healthcare, made accessible. Licence-checked clinicians, video consultations and M-Pesa payments across Kenya.
        </Text>
      </View>

      <View>
        <Head>Care</Head>
        <Link label="Find a doctor" onPress={() => router.navigate("/doctors")} />
        <Link label="Pharmacy" onPress={() => router.navigate("/pharmacy")} />
        <Link label="Home visits" onPress={() => void openSite("/home-visits-nairobi")} />
        <Link label="Ambulance line" onPress={() => router.navigate("/ambulance")} />
      </View>

      <View>
        <Head>Care Bora</Head>
        <Link label="About us" onPress={() => void openSite("/about")} />
        <Link label="How we verify providers" onPress={() => void openSite("/how-we-verify-providers")} />
        <Link label="Join as a provider" onPress={() => void openSite("/providers/apply")} />
        <Link label="Privacy policy" onPress={() => void openSite("/privacy")} />
        <Link label="Delete your account" onPress={() => router.navigate("/delete-account")} />
      </View>

      <View>
        <Head>Contact</Head>
        <Pressable onPress={() => callNumber(ambulancePhone)} accessibilityRole="link"
          style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.dangerSoft, borderRadius: 10, padding: 10, marginVertical: 6 }}>
          <Ambulance size={16} color="#BE123C" />
          <View>
            <Text style={{ color: "#BE123C", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Ambulance {ambulancePhone}</Text>
            <Text style={{ color: "#F43F5E", fontSize: 11 }}>Ambulance dispatch</Text>
          </View>
        </Pressable>
        {supportPhones.map((p) => <Line key={p} Icon={Phone} label={p} onPress={() => callNumber(p)} />)}
        <Line Icon={Mail} label={supportEmail} onPress={() => void emailTo(supportEmail)} />
        <Line Icon={MessageCircle} label={`WhatsApp ${WHATSAPP_DISPLAY}`} onPress={() => void Linking.openURL(WHATSAPP_URL)} />
        <Pressable onPress={() => router.navigate("/support/new")} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
          <MessageSquare size={16} color="#0F766E" />
          <Text style={{ color: "#0F766E", fontFamily: "Inter_500Medium", fontSize: 14 }}>Message us / request a document</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
          <MapPin size={16} color={t.textMuted} />
          <Text tone="muted" style={{ fontSize: 14 }}>Nairobi, Kenya</Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingVertical: 18, gap: 4 }}>
        <Text style={{ textAlign: "center", fontSize: 12, color: t.textFaint }}>© {new Date().getFullYear()} Care Bora Kenya. All rights reserved.</Text>
        <Text style={{ textAlign: "center", fontSize: 12, color: t.textFaint }}>
          Developed by{" "}
          <Text onPress={() => void openSite("https://edwin-kirimi-kinuthia.github.io/Edwin-Kirimi-Portfolio/")} style={{ fontSize: 12, color: "#0F766E", fontFamily: "Inter_600SemiBold" }}>
            Edwin Kirimi Kinuthia
          </Text>
        </Text>
      </View>
    </View>
  );
}

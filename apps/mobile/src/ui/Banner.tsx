import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck } from "lucide-react-native";
import { Avatar } from "./parts";
import { Text } from "./Text";
import { gradients } from "./theme";

/** The teal gradient strip with the "Verified" pill and the avatar overlapping its bottom edge, as on the website's provider cards. */
export function ProviderBanner({ name, uri, height = 96 }: { name: string; uri?: string | null; height?: number }) {
  return (
    <View style={{ marginBottom: 36 }}>
      <LinearGradient colors={gradients.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height }}>
        <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <BadgeCheck size={14} color="#0F766E" />
          <Text style={{ color: "#0F766E", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Verified</Text>
        </View>
      </LinearGradient>
      <View style={{ position: "absolute", left: 20, bottom: -36, borderWidth: 4, borderColor: "#fff", borderRadius: 22, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
        <Avatar name={name} uri={uri} size={72} />
      </View>
    </View>
  );
}

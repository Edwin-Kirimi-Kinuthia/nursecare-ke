import { Alert, Linking, Pressable } from "react-native";
import { usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from "@carebora/shared";

/** Screens that show the bottom tab bar, so the button has to sit above it. */
const TAB_ROUTES = new Set(["/", "/doctors", "/appointments", "/account"]);
const TAB_BAR_HEIGHT = 49;

/**
 * Floating "chat on WhatsApp" button. Opens the WhatsApp app when it's
 * installed and the web version otherwise (wa.me handles both). Not shown during
 * a video consultation, where it would cover the call controls.
 */
export function WhatsAppButton() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (pathname.startsWith("/consultation/")) return null;

  const bottom = insets.bottom + (TAB_ROUTES.has(pathname) ? TAB_BAR_HEIGHT : 0) + 16;

  async function open() {
    try {
      await Linking.openURL(WHATSAPP_URL);
    } catch {
      Alert.alert("WhatsApp", `Message us on WhatsApp at ${WHATSAPP_DISPLAY}.`);
    }
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel="Chat with Care Bora on WhatsApp"
      hitSlop={6}
      style={({ pressed }) => ({
        position: "absolute", right: 16, bottom, width: 56, height: 56, borderRadius: 28,
        backgroundColor: "#25D366", alignItems: "center", justifyContent: "center",
        opacity: pressed ? 0.85 : 1, elevation: 6,
        shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
      })}
    >
      <Ionicons name="logo-whatsapp" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

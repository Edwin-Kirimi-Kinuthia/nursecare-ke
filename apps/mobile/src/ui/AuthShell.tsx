import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";
import { gradients } from "./theme";

/** Sign-in / sign-up layout from the website: mint background, big logo, one white rounded card with a centred title. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <LinearGradient colors={gradients.page} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 96, alignItems: "stretch", gap: 20 }}>
          <Image source={require("../../assets/brand/logo-full.png")} style={{ width: "100%", height: 120, marginTop: 12 }} resizeMode="contain" accessibilityLabel="Care Bora" />
          <View style={{ backgroundColor: "#fff", borderRadius: 28, borderWidth: 1, borderColor: "#E2E8F0", padding: 24, gap: 16, shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 26, textAlign: "center", letterSpacing: -0.4 }}>{title}</Text>
              {subtitle ? <Text tone="muted" style={{ textAlign: "center" }}>{subtitle}</Text> : null}
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

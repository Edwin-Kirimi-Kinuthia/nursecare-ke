import { useEffect } from "react";
import { Linking, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { AppConfigProvider, useAppConfig } from "@/lib/appConfig";
import { APP_VERSION, STORE_URL, isOlderVersion } from "@/lib/config";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { useNotificationTaps } from "@/lib/push";
import { WhatsAppButton } from "@/features/WhatsAppButton";
import { AppHeader } from "@/ui/AppHeader";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";

// Keep the native splash up until we know whether there is a saved session, so
// a signed-in person never sees a flash of the signed-out app.
void SplashScreen.preventAutoHideAsync();

/** Where a protected screen sends someone who isn't allowed in. */
export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppConfigProvider>
          <CartProvider>
            <Gate />
          </CartProvider>
        </AppConfigProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { status, retry } = useAuth();
  const config = useAppConfig();
  const t = useTheme();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });

  useEffect(() => { if (status !== "booting" && (fontsLoaded || fontError)) void SplashScreen.hideAsync(); }, [status, fontsLoaded, fontError]);
  useNotificationTaps(status === "signedIn");

  if (status === "booting" || !(fontsLoaded || fontError)) return null;

  // The server can retire old builds (MOBILE_MIN_APP_VERSION) — for example
  // after a breaking API change or a security fix.
  const minimum = config?.app.minSupportedAppVersion;
  if (minimum && isOlderVersion(APP_VERSION, minimum)) {
    return (
      <Notice
        title="Please update Care Bora"
        body="This version is no longer supported. Update the app to keep booking and seeing your doctor."
        action="Update"
        onPress={() => Linking.openURL(STORE_URL!)}
      />
    );
  }
  if (status === "offline") {
    return (
      <Notice
        title="You're offline"
        body="We couldn't reach Care Bora. Check your internet connection and try again."
        action="Try again"
        onPress={retry}
      />
    );
  }

  const isAuthed = status === "signedIn";
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="dark" />
      <AppHeader />
      <Stack
        screenOptions={{
          // The back arrow lives in the persistent header (as on the website's nav);
          // each inner screen only adds a slim title strip under it.
          header: ({ options }) => <TitleStrip title={typeof options.title === "string" ? options.title : ""} />,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="provider/[id]" options={{ title: "" }} />
        <Stack.Screen name="support/index" options={{ title: "Messages" }} />
        <Stack.Screen name="support/new" options={{ title: "" }} />
        <Stack.Screen name="support/[id]" options={{ title: "Conversation" }} />
        <Stack.Screen name="ambulance" options={{ title: "Ambulance" }} />
        <Stack.Screen name="pharmacy/index" options={{ title: "" }} />
        <Stack.Screen name="pharmacy/[id]" options={{ title: "Medicine" }} />
        <Stack.Screen name="cart" options={{ title: "" }} />
        <Stack.Screen name="home-visits/index" options={{ title: "" }} />
        <Stack.Screen name="home-visits/new" options={{ title: "" }} />
        <Stack.Screen name="home-visits/[id]" options={{ title: "Home visit" }} />
        <Stack.Screen name="apply/provider" options={{ title: "" }} />
        <Stack.Screen name="apply/vendor" options={{ title: "" }} />
        <Stack.Screen name="ai/index" options={{ title: "" }} />
        <Stack.Screen name="labs/index" options={{ title: "" }} />
        <Stack.Screen name="records/index" options={{ title: "" }} />
        <Stack.Screen name="orders/index" options={{ title: "" }} />
        <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />

        {/* Signed-in only. Signing out while on one of these sends you back to the tabs. */}
        <Stack.Protected guard={isAuthed}>
          <Stack.Screen name="appointment/[id]" options={{ title: "Appointment" }} />
          <Stack.Screen name="consultation/[id]" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
          <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
          <Stack.Screen name="verify-email" options={{ title: "Verify your email" }} />
          <Stack.Screen name="delete-account" options={{ title: "Delete account" }} />
        </Stack.Protected>

        {/* Signed-out only. */}
        <Stack.Protected guard={!isAuthed}>
          <Stack.Screen name="login" options={{ title: "" }} />
          <Stack.Screen name="otp" options={{ title: "" }} />
          <Stack.Screen name="register" options={{ title: "" }} />
          <Stack.Screen name="forgot" options={{ title: "" }} />
        </Stack.Protected>
      </Stack>
      <WhatsAppButton />
    </View>
  );
}

function TitleStrip({ title }: { title: string }) {
  const t = useTheme();
  if (!title) return null;
  return (
    <View style={{ backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border, paddingHorizontal: 20, paddingVertical: 12 }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17 }}>{title}</Text>
    </View>
  );
}

function Notice({ title, body, action, onPress }: { title: string; body: string; action: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <Text variant="heading" style={{ textAlign: "center" }}>{title}</Text>
      <Text tone="muted" style={{ textAlign: "center" }}>{body}</Text>
      <View style={{ alignSelf: "stretch", marginTop: 12 }}><Button title={action} onPress={onPress} /></View>
    </View>
  );
}

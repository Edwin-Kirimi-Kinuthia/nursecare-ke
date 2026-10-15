import { useEffect } from "react";
import { Linking, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppConfigProvider, useAppConfig } from "@/lib/appConfig";
import { APP_VERSION, STORE_URL, isOlderVersion } from "@/lib/config";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { useNotificationTaps } from "@/lib/push";

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
          <Gate />
        </AppConfigProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { status, retry } = useAuth();
  const config = useAppConfig();
  const t = useTheme();

  useEffect(() => { if (status !== "booting") void SplashScreen.hideAsync(); }, [status]);
  useNotificationTaps(status === "signedIn");

  if (status === "booting") return null;

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
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.surface },
          headerTintColor: t.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="provider/[id]" options={{ title: "Doctor" }} />
        <Stack.Screen name="support/index" options={{ title: "Messages" }} />
        <Stack.Screen name="support/new" options={{ title: "Message us" }} />
        <Stack.Screen name="support/[id]" options={{ title: "Conversation" }} />
        <Stack.Screen name="ambulance" options={{ title: "Ambulance" }} />

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
          <Stack.Screen name="login" options={{ title: "Sign in" }} />
          <Stack.Screen name="otp" options={{ title: "Enter your code" }} />
          <Stack.Screen name="register" options={{ title: "Create account" }} />
          <Stack.Screen name="forgot" options={{ title: "Reset password" }} />
        </Stack.Protected>
      </Stack>
    </>
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

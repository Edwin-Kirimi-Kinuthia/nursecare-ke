import { useEffect, useState, useCallback } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { router } from "expo-router";
import { api } from "./api";

/**
 * Push notifications.
 *
 * What the server sends is only a title and a deep link (never a patient's name
 * or complaint — see pushService on the server), so a notification can be
 * shown on a lock screen safely. Tapping it opens the right screen.
 */

// While the app is open, show notifications as a banner instead of dropping them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

const TOKEN_KEY = "carebora.pushToken";

/** Map a web path from the server (`/consultations/<id>`) to a screen in this app. */
export function routeForLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  const [path] = link.split(/[?#]/);
  const consult = /^\/consultations\/([0-9a-f-]{36})$/i.exec(path);
  if (consult) return `/consultation/${consult[1]}`;
  const appointment = /^\/appointments\/([0-9a-f-]{36})$/i.exec(path);
  if (appointment) return `/appointment/${appointment[1]}`;
  if (path === "/appointments") return "/appointments";
  if (path === "/admin" || path.startsWith("/admin/")) return "/admin";
  if (path === "/vendor" || path.startsWith("/vendor/")) return "/vendor";
  if (path === "/contact" || path.startsWith("/contact/")) return "/support";
  if (path === "/home-visits" || /^\/home-visits\/[0-9a-f-]{36}$/i.test(path)) return path;
  if (path === "/orders" || /^\/orders\/[0-9a-f-]{36}$/i.test(path)) return path;
  if (["/records", "/labs"].includes(path)) return path;
  return null;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Appointments and messages",
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Get this phone's Expo push token and tell the server. Returns false if it couldn't (no EAS project yet, no Firebase config, offline…). */
async function registerToken(): Promise<boolean> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return false; // development builds before `eas init`
  try {
    await ensureAndroidChannel();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushDevice({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

/** Stop this phone receiving the signed-in person's notifications. Best effort; call before the session is discarded. */
export async function unregisterThisDevice() {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await api.unregisterPushDevice({ token });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* offline: the server drops dead tokens by itself */ }
}

export type PushPermission = "undetermined" | "granted" | "denied";

/**
 * Permission state and an `enable()` to ask for it. Registers the token
 * whenever permission is already granted, since tokens can change.
 */
export function usePushPermission(signedIn: boolean) {
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PushPermission>("undetermined");

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    (async () => {
      const p = await Notifications.getPermissionsAsync();
      if (!live) return;
      setPermission(p.granted ? "granted" : p.canAskAgain ? "undetermined" : "denied");
      if (p.granted && !await registerToken() && live) setRegistrationError("Notifications could not connect. Try enabling them again when online.");
    })().catch(() => {});
    return () => { live = false; };
  }, [signedIn]);

  const enable = useCallback(async () => {
    setRegistrationError(null);
    await ensureAndroidChannel();
    const p = await Notifications.requestPermissionsAsync();
    if (p.granted) {
      setPermission("granted");
      if (!await registerToken()) setRegistrationError("Notifications could not connect. Please try again when online.");
    } else {
      setPermission(p.canAskAgain ? "undetermined" : "denied");
      // Once refused on iOS the system won't ask again; only Settings can change it.
      if (!p.canAskAgain) void Linking.openSettings();
    }
  }, []);

  return { permission, enable, registrationError };
}

/** Open the right screen when a notification is tapped (including the tap that launched the app). */
export function useNotificationTaps(signedIn: boolean) {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!signedIn || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const to = routeForLink(response.notification.request.content.data?.link);
    if (to) router.push(to as never);
    void Notifications.clearLastNotificationResponseAsync();
  }, [signedIn, response]);
}

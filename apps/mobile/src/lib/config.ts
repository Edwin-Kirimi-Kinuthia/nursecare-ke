import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Where the API lives. EXPO_PUBLIC_* values are inlined at build time, so each
 * build profile in eas.json decides it; the default is production, so a build
 * made without a profile can't accidentally talk to a developer's machine.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://app.carebora.co.ke/api/v1").replace(/\/$/, "");
export const SITE_URL = API_URL.replace(/\/api\/v1$/, "");

export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** Where the store listing lives, for the "please update" screen. Filled in once the apps are published. */
export const STORE_URL = Platform.select({
  ios: process.env.EXPO_PUBLIC_IOS_STORE_URL ?? "https://apps.apple.com/ke/app/care-bora",
  android: process.env.EXPO_PUBLIC_ANDROID_STORE_URL ?? "https://play.google.com/store/apps/details?id=ke.co.carebora.app",
  default: SITE_URL,
});

/** True when `current` is an older version than `minimum` ("1.2.0" < "1.10.0"). */
export function isOlderVersion(current: string, minimum: string): boolean {
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = minimum.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

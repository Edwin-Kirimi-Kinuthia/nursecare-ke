import { Alert, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SITE_URL } from "./config";

/** Dial a number. Falls back to showing it, for devices with no phone app (tablets, simulators). */
export async function callNumber(phone: string) {
  const url = `tel:${phone.replace(/\s+/g, "")}`;
  try {
    if (await Linking.canOpenURL(url)) return await Linking.openURL(url);
  } catch { /* fall through */ }
  Alert.alert("Call", phone);
}

/** Open a web page in the in-app browser sheet, so people stay in the app. */
export const openSite = (path: string) => WebBrowser.openBrowserAsync(path.startsWith("http") ? path : `${SITE_URL}${path}`);

/** Open the mail app addressed to `to`. Not a web page, so it must not go through the in-app browser. */
export async function emailTo(to: string, subject?: string) {
  const url = `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  try {
    if (await Linking.canOpenURL(url)) return await Linking.openURL(url);
  } catch { /* fall through */ }
  Alert.alert("Email us", to);
}

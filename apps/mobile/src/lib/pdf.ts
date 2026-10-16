import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getAccessToken } from "./tokens";

/**
 * Open a PDF the API only serves to a signed-in person. A browser tab can't send
 * the bearer token, so download it with the header into the cache, then hand
 * it to the system share sheet (view, save to Files, send to a pharmacy…).
 */
export async function openAuthedPdf(url: string, filename: string) {
  const headers = { Authorization: `Bearer ${getAccessToken() ?? ""}` };
  if (Platform.OS === "web") {
    const blob = await (await fetch(url, { headers })).blob();
    window.open(URL.createObjectURL(blob), "_blank");
    return;
  }
  const file = await File.downloadFileAsync(url, new File(Paths.cache, filename), { headers, idempotent: true });
  if (!(await Sharing.isAvailableAsync())) throw new Error("This device can't open PDFs from here.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: filename });
}

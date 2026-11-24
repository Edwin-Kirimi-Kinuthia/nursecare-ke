import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getAccessToken } from "./tokens";
import { refreshSession } from "./api";

/** Fetch protected documents with the current session, renewing an expired token once. */
export async function openAuthedPdf(url: string, filename: string) {
  const request = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` } });
  let response = await request();
  if (response.status === 401 && await refreshSession()) response = await request();
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error?.message ?? "This document is not ready to download. Please try again.");
  }
  if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("The server did not return a PDF. Please try again.");
  if (Platform.OS === "web") {
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectUrl; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("This device can't open PDFs from here.");
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const file = new File(Paths.cache, `${Date.now()}-${safeName}`);
  try {
    file.create();
    await file.write(new Uint8Array(await response.arrayBuffer()));
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: filename });
  } finally { if (file.exists) file.delete(); }
}

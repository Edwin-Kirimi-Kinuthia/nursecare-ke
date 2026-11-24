import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SITE_URL } from "./config";
import { openSite } from "./links";

const documentTypes: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/heic": "heic", "image/heif": "heif",
  "image/avif": "avif", "image/bmp": "bmp", "image/tiff": "tiff",
};

/** Uploaded licences may be base64 data, which native browser sheets cannot open. */
export async function openUploadedDocument(uri: string) {
  if (!uri.startsWith("data:")) {
    const url = new URL(uri, SITE_URL);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported document address");
    await openSite(url.href);
    return;
  }
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(uri);
  const mime = match?.[1].toLowerCase();
  if (!match || !mime || !documentTypes[mime]) throw new Error("Unsupported document. Ask the applicant to upload a PDF or image.");
  if (Platform.OS === "web") {
    const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("Document viewing is not available on this device.");
  const file = new File(Paths.cache, `licence-${Date.now()}.${documentTypes[mime]}`);
  try {
    file.create();
    await file.write(match[2], { encoding: "base64" });
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: "Provider licence" });
  } finally { if (file.exists) file.delete(); }
}

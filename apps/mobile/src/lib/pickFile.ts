import * as DocumentPicker from "expo-document-picker";

/** Pick a photo-of-paper or PDF and return it as a data URL (the API takes uploads inline, up to ~8 MB). */
export async function pickDocumentDataUrl(maxBytes = 8_000_000): Promise<{ dataUrl: string; name: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  if (a.size && a.size > maxBytes) throw new Error("That file is over 8 MB. Choose a smaller one.");
  const blob = await (await fetch(a.uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Couldn't read that file."));
    r.readAsDataURL(blob);
  });
  return { dataUrl, name: a.name };
}

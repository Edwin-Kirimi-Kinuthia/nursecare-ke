import * as ImagePicker from "expo-image-picker";
import { SaveFormat, ImageManipulator } from "expo-image-manipulator";

/**
 * Let the person choose a photo and return it as a data URL the API accepts
 * (the server caps uploads at a few MB, and a camera photo is bigger than that,
 * so it's shrunk first). Returns null if they cancel.
 */
export async function pickImageDataUrl(opts: { camera?: boolean; width?: number } = {}): Promise<{ dataUrl: string; name: string } | null> {
  const launch = opts.camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  if (opts.camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Allow camera access in Settings to take a photo.");
  }
  const res = await launch({ mediaTypes: ["images"], quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const ctx = ImageManipulator.manipulate(a.uri);
  ctx.resize({ width: opts.width ?? 1280 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!out.base64) throw new Error("Couldn't read that photo.");
  return { dataUrl: `data:image/jpeg;base64,${out.base64}`, name: a.fileName ?? "photo.jpg" };
}

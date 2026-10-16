import { Pressable, Image, View } from "react-native";
import { FileCheck2, Upload, User as UserIcon } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "./theme";

/** Dashed "upload" button that shows a thumbnail (photos) or tick (documents) once chosen. */
export function FilePickRow({ label, chosen, name, preview, onPress, kind = "file" }: {
  label: string; chosen: boolean; name?: string | null; preview?: string | null; onPress: () => void; kind?: "photo" | "file";
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">{label}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: chosen ? "#14B8A6" : "#CBD5E1", borderRadius: 14, padding: 10, backgroundColor: chosen ? "#F0FDFA" : "#fff" }}>
        {preview ? <Image source={{ uri: preview }} style={{ width: 40, height: 40, borderRadius: 10 }} />
          : <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }}>
              {chosen ? <FileCheck2 size={18} color="#0D9488" /> : kind === "photo" ? <UserIcon size={18} color={t.textFaint} /> : <Upload size={18} color={t.textFaint} />}
            </View>}
        <Text numberOfLines={1} style={{ flex: 1, color: chosen ? "#0F766E" : t.textMuted, fontFamily: chosen ? "Inter_600SemiBold" : "Inter_400Regular" }}>
          {chosen ? (name ?? "Selected — tap to change") : kind === "photo" ? "Upload a photo" : "Upload (image or PDF)"}
        </Text>
      </Pressable>
    </View>
  );
}

import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { Text } from "./Text";

export function CheckRow({ checked, onToggle, title, hint, right }: { checked: boolean; onToggle: () => void; title: string; hint?: string; right?: string }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: checked ? "#14B8A6" : "#F1F5F9", backgroundColor: checked ? "#F0FDFA" : "#fff", borderRadius: 14, padding: 12 }}>
      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: checked ? "#0D9488" : "#CBD5E1", backgroundColor: checked ? "#0D9488" : "#fff", alignItems: "center", justifyContent: "center" }}>
        {checked ? <Check size={14} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold" }}>{title}</Text>
        {hint ? <Text variant="caption" tone="faint">{hint}</Text> : null}
      </View>
      {right ? <Text style={{ color: "#0F766E", fontFamily: "Inter_700Bold" }}>{right}</Text> : null}
    </Pressable>
  );
}

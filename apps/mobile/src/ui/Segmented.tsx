import { Pressable, View } from "react-native";
import { Text } from "./Text";

/** Two-or-three-way toggle, like the website's Browse / My orders switch. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 4, gap: 4 }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: value === o.value }}
          style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, backgroundColor: value === o.value ? "#0D9488" : "transparent" }}>
          <Text style={{ color: value === o.value ? "#fff" : "#475569", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

import { Pressable, ScrollView } from "react-native";
import { Text } from "./Text";

/** A horizontally scrolling tab strip, like the website's dashboard tabs. */
export function TabBar<T extends string>({ value, tabs, onChange }: { value: T; tabs: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 4, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, padding: 4 }}>
      {tabs.map((t) => (
        <Pressable key={t.id} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: value === t.id }}
          style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: value === t.id ? "#0D9488" : "transparent" }}>
          <Text style={{ color: value === t.id ? "#fff" : "#475569", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

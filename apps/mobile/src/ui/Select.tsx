import { useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { useTheme } from "./theme";

export type Option<T extends string> = { value: T; label: string; hint?: string };

/** A dropdown: shows the chosen label, and opens a bottom sheet list to change it. */
export function Select<T extends string>({ label, value, options, onChange, placeholder = "Choose…", compact }: {
  label?: string; value: T | ""; options: Option<T>[]; onChange: (v: T) => void; placeholder?: string; compact?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="label" tone="muted">{label}</Text> : null}
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label ?? placeholder}
        style={{ minHeight: compact ? 40 : 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: t.border, borderRadius: 14, backgroundColor: "#fff" }}>
        <Text style={{ flex: 1, color: chosen ? t.text : t.textFaint, fontSize: 15 }} numberOfLines={1}>{chosen?.label ?? placeholder}</Text>
        <ChevronDown size={18} color={t.textFaint} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: t.overlay }} onPress={() => setOpen(false)} />
        <View style={{ maxHeight: "70%", backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17 }}>{label ?? placeholder}</Text>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item.value); setOpen(false); }} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, backgroundColor: pressed ? "#F8FAFC" : "#fff" })}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: item.value === value ? "Inter_600SemiBold" : "Inter_400Regular", color: item.value === value ? "#0F766E" : t.text }}>{item.label}</Text>
                  {item.hint ? <Text variant="caption" tone="muted">{item.hint}</Text> : null}
                </View>
                {item.value === value ? <Check size={18} color="#0F766E" /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

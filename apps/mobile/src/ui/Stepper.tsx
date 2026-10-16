import { Pressable, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "./theme";

/** − 2 + quantity control, as on the website's drug cards. */
export function Stepper({ qty, onAdd, onSub, disableAdd }: { qty: number; onAdd: () => void; onSub: () => void; disableAdd?: boolean }) {
  const t = useTheme();
  const btn = { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10 } as const;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 2 }}>
      <Pressable onPress={onSub} accessibilityRole="button" accessibilityLabel="Remove one" style={btn}><Minus size={16} color={t.textMuted} /></Pressable>
      <Text style={{ width: 28, textAlign: "center", fontFamily: "Inter_700Bold" }}>{qty}</Text>
      <Pressable onPress={onAdd} disabled={disableAdd} accessibilityRole="button" accessibilityLabel="Add one" style={[btn, disableAdd ? { opacity: 0.4 } : null]}><Plus size={16} color={t.textMuted} /></Pressable>
    </View>
  );
}

import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PASSWORD_RULES } from "@carebora/shared";
import { Text } from "./Text";
import { useTheme } from "./theme";

/**
 * The live checklist under a "new password" field. It renders PASSWORD_RULES,
 * the same array the server's validation is built from, so a rule shown ticked
 * here can never be one the server then rejects.
 */
export function PasswordChecklist({ value }: { value: string }) {
  const t = useTheme();
  if (!value) return null;
  const allMet = PASSWORD_RULES.every((r) => r.test(value));
  if (allMet) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="checkmark-circle" size={16} color={t.okText} />
        <Text variant="caption" style={{ color: t.okText }}>Meets all requirements</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 3 }}>
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={15} color={ok ? t.okText : t.textFaint} />
            <Text variant="caption" style={{ color: ok ? t.okText : t.textFaint }}>{r.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

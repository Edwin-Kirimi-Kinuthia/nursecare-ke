import { Pressable, View } from "react-native";
import { NAME_TITLES, type NameParts } from "@carebora/shared";
import { Field } from "./Field";
import { Text } from "./Text";
import { radius, useTheme } from "./theme";

/**
 * Surname, first name and optional middle name, in that order — the same three
 * fields every name form on the website asks for. `showTitle` adds the optional
 * title (Dr., Prof., …) and is for care providers only.
 */
export function NameFields({ value, onChange, showTitle }: { value: NameParts; onChange: (v: NameParts) => void; showTitle?: boolean }) {
  const t = useTheme();
  const set = (k: keyof NameParts, v: string) => onChange({ ...value, [k]: v });
  return (
    <View style={{ gap: 14 }}>
      {showTitle && (
        <View style={{ gap: 6 }}>
          <Text variant="label" tone="muted">Title (optional)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["", ...NAME_TITLES].map((title) => {
              const selected = (value.title ?? "") === title;
              return (
                <Pressable
                  key={title || "none"}
                  onPress={() => set("title", title)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, backgroundColor: selected ? t.primary : t.surface, borderColor: selected ? t.primary : t.border }}
                >
                  <Text variant="label" style={{ color: selected ? t.onPrimary : t.textMuted }}>{title || "None"}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <Field label="Surname" value={value.surname} onChangeText={(v) => set("surname", v)} autoCapitalize="words" autoComplete="family-name" textContentType="familyName" placeholder="Kamau" />
      <Field label="First name" value={value.firstName} onChangeText={(v) => set("firstName", v)} autoCapitalize="words" autoComplete="given-name" textContentType="givenName" placeholder="Jane" />
      <Field label="Middle name (optional)" value={value.middleName} onChangeText={(v) => set("middleName", v)} autoCapitalize="words" autoComplete="additional-name" textContentType="middleName" placeholder="Wanjiru" />
    </View>
  );
}

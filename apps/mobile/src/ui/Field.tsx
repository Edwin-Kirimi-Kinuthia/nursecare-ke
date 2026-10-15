import { forwardRef, useState } from "react";
import { Pressable, TextInput, type TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { radius, useTheme } from "./theme";

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  /** Show the eye toggle and hide the text (passwords). */
  secure?: boolean;
  right?: React.ReactNode;
};

/** Labelled text input. The label is read out by screen readers and stays visible while typing. */
export const Field = forwardRef<React.ComponentRef<typeof TextInput>, Props>(function Field(
  { label, error, hint, secure, right, style, ...rest }, ref,
) {
  const t = useTheme();
  const [reveal, setReveal] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: t.surface,
          borderWidth: 1.5,
          borderColor: error ? t.danger : focused ? t.primary : t.border,
          borderRadius: radius.md,
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={t.textFaint}
          secureTextEntry={secure && !reveal}
          autoCapitalize={secure ? "none" : rest.autoCapitalize}
          autoCorrect={secure ? false : rest.autoCorrect}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={[{ flex: 1, minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: t.text }, style]}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setReveal((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? "Hide password" : "Show password"}
            hitSlop={8}
            style={{ paddingHorizontal: 14 }}
          >
            <Ionicons name={reveal ? "eye-off-outline" : "eye-outline"} size={20} color={t.textFaint} />
          </Pressable>
        ) : right}
      </View>
      {error ? <Text variant="caption" tone="danger">{error}</Text> : hint ? <Text variant="caption" tone="faint">{hint}</Text> : null}
    </View>
  );
});

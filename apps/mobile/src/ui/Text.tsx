import { Text as RNText, StyleSheet, type TextProps } from "react-native";
import { useTheme } from "./theme";

const VARIANTS = {
  title: { fontSize: 28, lineHeight: 34, fontFamily: "Inter_800ExtraBold" },
  heading: { fontSize: 20, lineHeight: 26, fontFamily: "Inter_700Bold" },
  subheading: { fontSize: 16, lineHeight: 22, fontFamily: "Inter_700Bold" },
  body: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  label: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_600SemiBold" },
  caption: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
} as const;

/** Custom fonts have one file per weight, so a fontWeight in a style must pick the matching family. */
const FAMILY: Record<string, string> = {
  "400": "Inter_400Regular", normal: "Inter_400Regular", "500": "Inter_500Medium", "600": "Inter_600SemiBold",
  "700": "Inter_700Bold", bold: "Inter_700Bold", "800": "Inter_800ExtraBold", "900": "Inter_800ExtraBold",
};

export type TextVariant = keyof typeof VARIANTS;

/**
 * The one text component. Respects the system font-size setting (people with
 * low vision depend on it) and never sets a colour that ignores the theme.
 */
export function Text({
  variant = "body", tone = "default", style, ...props
}: TextProps & { variant?: TextVariant; tone?: "default" | "muted" | "faint" | "primary" | "danger" | "onPrimary" }) {
  const t = useTheme();
  const color =
    tone === "muted" ? t.textMuted : tone === "faint" ? t.textFaint : tone === "primary" ? t.primarySoftText
    : tone === "danger" ? t.dangerText : tone === "onPrimary" ? t.onPrimary : t.text;
  const flat = StyleSheet.flatten(style) ?? {};
  const family = flat.fontWeight ? FAMILY[String(flat.fontWeight)] : undefined;
  return <RNText {...props} style={[VARIANTS[variant], { color }, style, family ? { fontFamily: family, fontWeight: undefined } : null]} />;
}

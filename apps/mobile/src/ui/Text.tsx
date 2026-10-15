import { Text as RNText, type TextProps } from "react-native";
import { useTheme } from "./theme";

const VARIANTS = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "400" },
} as const;

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
  return <RNText {...props} style={[VARIANTS[variant], { color }, style]} />;
}

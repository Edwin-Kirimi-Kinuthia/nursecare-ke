import { useColorScheme } from "react-native";

/**
 * Colours match the website (teal on slate) so the product looks like one thing
 * whether someone is on their phone or their laptop. Every colour has a light
 * and a dark value; components read them through useTheme() and never use a
 * literal, which is what keeps dark mode from being half-done.
 */
const light = {
  bg: "#F6F8F9",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F5",
  border: "#E2E8F0",
  text: "#0B1F1C",
  textMuted: "#475569",
  textFaint: "#94A3B8",
  primary: "#0D9488",
  primaryPressed: "#0F766E",
  onPrimary: "#FFFFFF",
  primarySoft: "#E6F7F5",
  primarySoftText: "#0F766E",
  danger: "#E11D48",
  dangerSoft: "#FFF1F2",
  dangerText: "#9F1239",
  warnSoft: "#FFFBEB",
  warnText: "#92400E",
  okSoft: "#ECFDF5",
  okText: "#047857",
  star: "#F59E0B",
  overlay: "rgba(15,23,42,0.5)",
} as const;

const dark: Record<keyof typeof light, string> = {
  bg: "#081715",
  surface: "#0F2321",
  surfaceAlt: "#16302D",
  border: "#1E3835",
  text: "#E8F2F0",
  textMuted: "#A9BDBA",
  textFaint: "#6F8A86",
  primary: "#2DD4BF",
  primaryPressed: "#5EEAD4",
  onPrimary: "#04211E",
  primarySoft: "#0C2B28",
  primarySoftText: "#5EEAD4",
  danger: "#FB7185",
  dangerSoft: "#3B1219",
  dangerText: "#FDA4AF",
  warnSoft: "#33260A",
  warnText: "#FCD34D",
  okSoft: "#0B2B20",
  okText: "#6EE7B7",
  star: "#FBBF24",
  overlay: "rgba(0,0,0,0.6)",
};

export type Theme = { [K in keyof typeof light]: string } & { isDark: boolean };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? { ...dark, isDark: true } : { ...light, isDark: false };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

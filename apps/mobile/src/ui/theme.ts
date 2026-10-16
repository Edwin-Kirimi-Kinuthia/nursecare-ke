
/**
 * Colours match the website (teal on slate) so the product looks like one thing
 * whether someone is on their phone or their laptop. Components read them
 * through useTheme() rather than using literals.
 */
const light = {
  bg: "#F6F8F9",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F5",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
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

export type Theme = { [K in keyof typeof light]: string } & { isDark: boolean };

/** The website has no dark mode, so the app is light only and looks the same as the site. */
const theme: Theme = { ...light, isDark: false };
export function useTheme(): Theme {
  return theme;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/** Brand gradients, same stops as the website's Tailwind classes. */
export const gradients = {
  hero: ["#042F2E", "#134E4A", "#064E3B"] as const, // teal-950 → teal-900 → emerald-900
  banner: ["#14B8A6", "#0D9488", "#059669"] as const,
  button: ["#0D9488", "#059669"] as const,
  page: ["#ECFDF5", "#F0FDFA", "#FFFFFF"] as const,
} as const;
export const NAVY = "#0F172A";

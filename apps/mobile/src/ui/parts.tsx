import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { nameInitial } from "@carebora/shared";
import { SITE_URL } from "@/lib/config";
import { Text } from "./Text";
import { Button } from "./Button";
import { radius, space, useTheme } from "./theme";

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) {
  const t = useTheme();
  const common = { width: size, height: size, borderRadius: size * 0.3 };
  // The API returns a public doctor's photo as a path on the site
  // ("/api/v1/providers/<id>/avatar?v=…"). A browser resolves that against the
  // page it's on; a phone has no page, so a relative URI loads nothing at all.
  const absolute = uri?.startsWith("/") ? `${SITE_URL}${uri}` : uri;
  if (absolute) return <Image source={{ uri: absolute }} accessibilityLabel={name} style={[common, { backgroundColor: t.surfaceAlt }]} />;
  return (
    <View style={[common, { backgroundColor: t.primarySoft, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: t.primarySoftText, fontSize: size * 0.4, fontWeight: "700" }}>{nameInitial(name)}</Text>
    </View>
  );
}

const BADGE = {
  ok: ["okSoft", "okText"], warn: ["warnSoft", "warnText"], danger: ["dangerSoft", "dangerText"],
  info: ["primarySoft", "primarySoftText"], neutral: ["surfaceAlt", "textMuted"],
} as const;

export function Badge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof BADGE }) {
  const t = useTheme();
  const [bg, fg] = BADGE[tone];
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: t[bg], paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
      <Text variant="caption" style={{ color: t[fg], fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const t = useTheme();
  const rounded = Math.round(value);
  return (
    <View style={{ flexDirection: "row", gap: 2 }} accessible accessibilityLabel={`${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= rounded ? "star" : "star-outline"} size={size} color={i <= rounded ? t.star : t.textFaint} />
      ))}
    </View>
  );
}

/** Pill that toggles a filter. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
        backgroundColor: selected ? t.primary : t.surface, borderColor: selected ? t.primary : t.border,
      }}
    >
      <Text variant="label" style={{ color: selected ? t.onPrimary : t.textMuted }}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ tone = "info", children }: { tone?: "info" | "warn" | "danger" | "ok"; children: React.ReactNode }) {
  const t = useTheme();
  const [bg, fg] = BADGE[tone];
  return (
    <View style={{ backgroundColor: t[bg], borderRadius: radius.md, padding: space.md }}>
      <Text variant="body" style={{ color: t[fg] }}>{children}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
      <ActivityIndicator color={t.primary} size="large" />
      {label ? <Text tone="muted">{label}</Text> : null}
    </View>
  );
}

export function Empty({ icon = "file-tray-outline", title, hint, action }: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; hint?: string; action?: { label: string; onPress: () => void };
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: t.primarySoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={t.primarySoftText} />
      </View>
      <Text variant="subheading" style={{ textAlign: "center" }}>{title}</Text>
      {hint ? <Text tone="muted" style={{ textAlign: "center" }}>{hint}</Text> : null}
      {action ? <View style={{ marginTop: 8 }}><Button title={action.label} onPress={action.onPress} size="sm" /></View> : null}
    </View>
  );
}

/** A row that goes somewhere: icon, title, optional subtitle and chevron. */
export function Row({ icon, title, subtitle, onPress, tone = "default", trailing }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress: () => void; tone?: "default" | "danger"; trailing?: React.ReactNode;
}) {
  const t = useTheme();
  const color = tone === "danger" ? t.danger : t.primarySoftText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: tone === "danger" ? t.dangerSoft : t.primarySoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subheading" style={tone === "danger" ? { color: t.danger } : undefined}>{title}</Text>
        {subtitle ? <Text variant="caption" tone="muted">{subtitle}</Text> : null}
      </View>
      {trailing}
      <Ionicons name="chevron-forward" size={18} color={t.textFaint} />
    </Pressable>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border }} />;
}

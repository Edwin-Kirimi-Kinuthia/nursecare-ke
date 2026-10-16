import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "./theme";

/** The website's page heading: teal eyebrow with an icon, big bold title, slate lede. */
export function PageHeader({ eyebrow, Icon, title, lede }: { eyebrow?: string; Icon?: LucideIcon; title: string; lede?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8, paddingTop: 8 }}>
      {eyebrow ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {Icon ? <Icon size={18} color={t.primary} /> : null}
          <Text style={{ color: t.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{eyebrow}</Text>
        </View>
      ) : null}
      <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }}>{title}</Text>
      {lede ? <Text tone="muted" style={{ fontSize: 16, lineHeight: 24 }}>{lede}</Text> : null}
    </View>
  );
}

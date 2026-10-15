import { View } from "react-native";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";

/**
 * A provider's live status. Available: bookings are confirmed instantly. Busy:
 * they can still be booked but confirm each request first — so "Busy" says what
 * it means for the person about to book rather than reading as "don't bother".
 */
export function AvailabilityDot({ available }: { available: boolean }) {
  const t = useTheme();
  const color = available ? t.okText : t.warnText;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }} accessible accessibilityLabel={available ? "Available" : "Busy, confirms bookings"}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: available ? "#10B981" : "#F59E0B" }} />
      <Text variant="label" style={{ color }}>{available ? "Available" : "Busy"}</Text>
      {!available && <Text variant="caption" tone="faint">· confirms bookings</Text>}
    </View>
  );
}

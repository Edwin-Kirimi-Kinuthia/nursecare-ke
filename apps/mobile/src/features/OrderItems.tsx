import { View } from "react-native";
import type { OrderItem } from "@carebora/api-client";
import { kes } from "@/lib/format";
import { Text } from "@/ui/Text";

export function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <View accessibilityLabel="Ordered items" style={{ gap: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 10 }}>
      <Text variant="label" tone="muted">Ordered items</Text>
      {items.map((item) => (
        <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>{item.drugName}</Text>
            <Text variant="caption" tone="muted">Quantity: {item.qty} · {kes(item.unitPriceKes)} each</Text>
          </View>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>{kes(item.unitPriceKes * item.qty)}</Text>
        </View>
      ))}
    </View>
  );
}

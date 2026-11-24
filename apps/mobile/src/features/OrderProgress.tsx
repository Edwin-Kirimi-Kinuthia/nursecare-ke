import { View } from "react-native";
import type { VendorOrder } from "@carebora/api-client";
import { orderStatusLabel } from "@carebora/shared";
import { dayTime } from "@/lib/format";
import { Text } from "@/ui/Text";
export function OrderProgress({ order }: { order: VendorOrder }) {
  const history = order.statusHistory?.length ? order.statusHistory : [{ id: order.id, status: order.status, createdAt: order.updatedAt }];
  return <View accessibilityLabel="Order status history" style={{ gap: 6, paddingVertical: 8 }}>{history.map(e => <Text key={e.id} variant="caption" tone="muted">{orderStatusLabel(e.status)} · {dayTime(e.createdAt)}</Text>)}</View>;
}

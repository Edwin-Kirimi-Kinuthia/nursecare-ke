import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Badge, Empty, Loading } from "@/ui/parts";
import { orderLabel, orderTone } from "@/features/orderStatus";

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const res = useAsync(() => api.getOrder(id), [id]);
  if (res.loading && !res.data) return <Loading />;
  const o = res.data;
  if (!o) return <Screen><Empty icon="alert-circle-outline" title="Couldn't load this order" hint={res.error ?? undefined} /></Screen>;
  return (
    <Screen onRefresh={res.reload} refreshing={res.refreshing}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 24 }}>Order {o.id.slice(0, 8).toUpperCase()}</Text>
        <Text tone="muted">{dayTime(o.createdAt)}</Text>
      </View>
      {o.vendorOrders.map((v) => (
        <Card key={v.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="subheading">{v.organization.name}</Text>
            <Badge label={orderLabel(v.status)} tone={orderTone(v.status)} />
          </View>
          {v.items.map((i) => (
            <View key={i.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ flex: 1 }}>{i.qty} × {i.drugName}</Text>
              <Text tone="muted">{kes(i.unitPriceKes * i.qty)}</Text>
            </View>
          ))}
          {v.deliveryFeeKes > 0 && <Text variant="caption" tone="muted">Delivery {kes(v.deliveryFeeKes)}</Text>}
          {v.dispatchedAt && <Text variant="caption" tone="muted">Dispatched {dayTime(v.dispatchedAt)}</Text>}
          {v.deliveredAt && <Text variant="caption" tone="muted">Delivered {dayTime(v.deliveredAt)}</Text>}
        </Card>
      ))}
      <Card>
        <Text variant="label" tone="muted">DELIVERY</Text>
        <Text>{o.deliveryAddress}</Text>
        <Text variant="label" tone="muted" style={{ marginTop: 6 }}>TOTAL</Text>
        <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>{kes(o.totalKes)}</Text>
        {o.payment && <Text variant="caption" tone="muted">Payment: {o.payment.status}{o.payment.receiptNumber ? ` · M-Pesa ${o.payment.receiptNumber}` : ""}</Text>}
      </Card>
    </Screen>
  );
}

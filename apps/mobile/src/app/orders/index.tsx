import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Package } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { useTheme } from "@/ui/theme";
import { orderTone, orderLabel } from "@/features/orderStatus";

export default function OrdersScreen() {
  const t = useTheme();
  const list = useAsync(() => api.listOrders({ limit: 30 } as never), []);
  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing}>
      <PageHeader eyebrow="Pharmacy" Icon={Package} title="My orders" />
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <View style={{ height: 200 }}><Loading /></View>
        : list.data && list.data.orders.length === 0 ? <Empty icon="cube-outline" title="No orders yet" hint="Medicine you order will show up here." action={{ label: "Browse pharmacy", onPress: () => router.push("/pharmacy") }} />
        : list.data?.orders.map((o) => {
          const status = o.vendorOrders[0]?.status ?? "pending";
          return (
            <Pressable key={o.id} onPress={() => router.push({ pathname: "/orders/[id]", params: { id: o.id } })} accessibilityRole="button"
              style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>Order {o.id.slice(0, 8).toUpperCase()}</Text>
                <Badge label={orderLabel(status)} tone={orderTone(status)} />
              </View>
              <Text variant="caption" tone="muted">{dayTime(o.createdAt)} · {o.vendorOrders.reduce((n, v) => n + v.items.length, 0)} item(s)</Text>
              <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 18 }}>{kes(o.totalKes)}</Text>
            </Pressable>
          );
        })}
    </Screen>
  );
}

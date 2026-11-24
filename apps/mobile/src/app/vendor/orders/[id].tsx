import { useEffect } from "react";
import { AppState } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";
import { Banner, Loading } from "@/ui/parts";
import { OrderItems } from "@/features/OrderItems";
import { OrderProgress } from "@/features/OrderProgress";
import { OrderStatusActions } from "@/features/OrderStatusActions";
export default function VendorOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useAsync(() => api.getVendorOrder(id), [id]);
  const reload = list.reload;
  useEffect(() => { const timer = setInterval(() => { if (AppState.currentState === "active") void reload(); },15000); return () => clearInterval(timer); },[reload]);
  const order = list.data;
  return <Screen onRefresh={reload} refreshing={list.refreshing}>
    <Text variant="heading">Pharmacy order details</Text>
    {list.error && <Banner tone="danger">{list.error}</Banner>}<Button title="Refresh order" variant="secondary" onPress={() => void reload()} />
    {list.loading && !order ? <Loading /> : order && <Card>
      <Text variant="heading">Order #{order.id.slice(0,8).toUpperCase()}</Text><Text tone="muted">{dayTime(order.createdAt)}</Text>
      <Text variant="subheading">Delivery details</Text><Text>{order.order?.patient.fullName}</Text><Text>{order.order?.deliveryAddress}</Text><Text>Contact: {order.order?.phoneNumber}</Text>{order.order?.deliveryNotes ? <Text>Notes: {order.order.deliveryNotes}</Text> : null}
      <OrderItems items={order.items} /><Text>Total: {kes(order.subtotalKes)}</Text><Text>Payment: {order.order?.payment?.status.replaceAll("_"," ") ?? "unpaid"}</Text>
      <OrderProgress order={order} /><Text variant="subheading">Update delivery</Text><OrderStatusActions key={order.status} order={order} dropdown onUpdated={reload} />
    </Card>}
  </Screen>;
}

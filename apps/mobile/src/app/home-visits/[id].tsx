import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { VISIT_LABEL, visitTone } from "@/features/homeVisitStatus";
import { MpesaPay } from "@/features/MpesaPay";
import { Screen, Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";
import { useAuth } from "@/lib/auth";

export default function HomeVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const res = useAsync(() => api.getHomeVisit(id), [id]);
  if (res.loading && !res.data) return <Loading />;
  const v = res.data;
  if (!v) return <Screen><Empty icon="alert-circle-outline" title="Couldn't load this visit" hint={res.error ?? undefined} /></Screen>;
  return (
    <Screen onRefresh={res.reload} refreshing={res.refreshing}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 24, textTransform: "capitalize" }}>{v.specialty} visit</Text>
        <Badge label={VISIT_LABEL[v.status]} tone={visitTone(v.status)} />
      </View>
      {v.urgency === "emergency" && <Banner tone="danger">Marked as an emergency. For life-threatening situations call 999 / 112.</Banner>}
      <Card>
        <Text>{v.description}</Text>
        <Text variant="caption" tone="muted">{v.address}, {v.county}</Text>
        {v.scheduledAt && <Text variant="caption" tone="muted">Preferred time: {dayTime(v.scheduledAt)}</Text>}
        {v.provider && <Text variant="caption" tone="muted">Provider: {v.provider.user.fullName}</Text>}
        <Text variant="caption" tone="faint">Requested {dayTime(v.createdAt)}</Text>
      </Card>
      {v.status === "assigned" && v.feeKes ? (
        <MpesaPay initiate={(phone) => api.payHomeVisit(v.id, { phoneNumber: phone }).then((x) => ({ id: x.payment!.id }))} amountKes={v.feeKes}
          defaultPhone={user?.phone} noun="home visit" sitePath="/home-visits" onPaid={res.reload} />
      ) : null}
      {v.payment?.receiptNumber && <Banner tone="ok">Paid {kes(v.feeKes)} · M-Pesa receipt {v.payment.receiptNumber}</Banner>}
      {v.visitNotes && <Card><Text variant="label" tone="muted">PROVIDER NOTES</Text><Text>{v.visitNotes}</Text></Card>}
      {v.status === "cancelled" && v.payment?.failureReason && <Banner tone="danger">{v.payment.failureReason}</Banner>}
    </Screen>
  );
}

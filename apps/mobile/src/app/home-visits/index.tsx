import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Home, MapPin, Plus } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { VISIT_LABEL, visitTone } from "@/features/homeVisitStatus";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { useTheme } from "@/ui/theme";
import { useAuth } from "@/lib/auth";
import { SignInPrompt } from "@/features/SignInPrompt";

export default function HomeVisitsScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const list = useAsync(() => (user ? api.listHomeVisits({ limit: 50 } as never) : Promise.resolve(null)), [user?.id]);
  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing}>
      <PageHeader eyebrow="Home-based care" Icon={Home} title="Home visits" lede="Request a nurse, physiotherapist or doctor to come to you. You'll be matched to a provider near you and pay only once they're assigned." />
      {!user ? <SignInPrompt icon="home-outline" title="Sign in to request a visit" hint="We match you to a nurse, physio or doctor near you." /> : <>
      <Button title="Request a visit" icon={<Plus size={18} color="#fff" />} onPress={() => router.push("/home-visits/new")} />
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <View style={{ height: 200 }}><Loading /></View>
        : list.data && list.data.visits.length === 0 ? <Empty icon="home-outline" title="No home visits yet" hint="Request a visit and we'll match you to a provider near you." />
        : list.data?.visits.map((v) => (
          <Pressable key={v.id} onPress={() => router.push({ pathname: "/home-visits/[id]", params: { id: v.id } })} accessibilityRole="button"
            style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Text style={{ fontFamily: "Inter_700Bold", textTransform: "capitalize" }}>{v.specialty} visit</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {v.urgency !== "routine" && <Badge label={v.urgency === "emergency" ? "Emergency" : "Urgent"} tone={v.urgency === "emergency" ? "danger" : "warn"} />}
                <Badge label={VISIT_LABEL[v.status]} tone={visitTone(v.status)} />
              </View>
            </View>
            <Text tone="muted" numberOfLines={2}>{v.description}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MapPin size={13} color={t.textMuted} /><Text variant="caption" tone="muted">{v.address}, {v.county}</Text></View>
            <Text variant="caption" tone="faint">{dayTime(v.createdAt)}{v.feeKes ? ` · ${kes(v.feeKes)}` : ""}</Text>
            {v.status === "assigned" && <Text style={{ color: "#0F766E", fontFamily: "Inter_600SemiBold" }}>Pay {kes(v.feeKes)} via M-Pesa →</Text>}
          </Pressable>
        ))}
      </>}
    </Screen>
  );
}

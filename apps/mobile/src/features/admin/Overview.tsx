import { useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, Home, ShoppingBag, Users, Wallet, type LucideIcon } from "lucide-react-native";
import type { PlatformStats } from "@carebora/api-client";
import { kes } from "@/lib/format";
import { Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Banner, Loading } from "@/ui/parts";
import { gradients } from "@/ui/theme";
import { Segmented } from "@/ui/Segmented";

const TONES = [["#14B8A6", "#059669"], ["#6366F1", "#7C3AED"], ["#10B981", "#16A34A"], ["#F59E0B", "#EA580C"], ["#F43F5E", "#EC4899"]] as const;
const SUBJECTS: { key: keyof PlatformStats["payments"]["bySubject"]; label: string }[] = [
  { key: "appointment", label: "Consultations" }, { key: "home_visit", label: "Home visits" }, { key: "order", label: "Pharmacy" }, { key: "lab_order", label: "Lab tests" }, { key: "ambulance", label: "Ambulance" },
];

function Stat({ Icon, label, value, tone }: { Icon: LucideIcon; label: string; value: string | number; tone: number }) {
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 14, gap: 8 }}>
      <LinearGradient colors={[...TONES[tone]!]} style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}><Icon size={18} color="#fff" /></LinearGradient>
      <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}

export function Overview({ stats, loading, error }: { stats: PlatformStats | null; loading: boolean; error: string | null }) {
  const [period, setPeriod] = useState<"today" | "30" | "all">("all");
  if (loading && !stats) return <Loading />;
  if (error) return <Banner tone="danger">{error}</Banner>;
  if (!stats) return null;
  const p = stats.payments;
  const view = period === "today" ? p.periods.today : period === "30" ? p.periods.last30Days : { collectedKes: p.collectedKes, earningsKes: p.earningsKes };
  const largest = Math.max(1, ...SUBJECTS.map((r) => p.bySubject[r.key]));
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat Icon={Users} label="Users" value={stats.users.total} tone={0} />
        <Stat Icon={CalendarDays} label="Appointments" value={stats.appointments.total} tone={1} />
        <Stat Icon={Wallet} label="Earnings" value={kes(p.earningsKes)} tone={2} />
        <Stat Icon={ShoppingBag} label="Orders" value={stats.orders.total} tone={3} />
        <Stat Icon={Home} label="Home visits" value={stats.homeVisits.total} tone={4} />
      </View>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, gap: 8 }}>
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>Care Bora earnings</Text>
        <Text style={{ color: "#99F6E4", fontSize: 12 }}>Commission, plus the full value of sales made by Care Bora Pharmacy.</Text>
        <Segmented value={period} onChange={setPeriod} options={[{ value: "today", label: "Today" }, { value: "30", label: "30 days" }, { value: "all", label: "All time" }]} />
        <Text style={{ color: "#fff", fontFamily: "Inter_800ExtraBold", fontSize: 30 }}>{kes(view.earningsKes)}</Text>
        <Text style={{ color: "#99F6E4" }}>from {kes(view.collectedKes)} collected</Text>
        <View style={{ flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 12 }}>
          {[["Collected", p.collectedKes], ["Owed to providers & vendors", p.owedKes], ["Refunded", p.refundedKes]].map(([k, v]) => (
            <View key={k as string} style={{ flex: 1 }}><Text style={{ color: "#fff", fontFamily: "Inter_800ExtraBold" }}>{kes(v as number)}</Text><Text style={{ color: "#99F6E4", fontSize: 11 }}>{k}</Text></View>
          ))}
        </View>
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 12 }}>
          <Text style={{ color: "#99F6E4", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 }}>COLLECTED BY SERVICE</Text>
          {SUBJECTS.map(({ key, label }) => (
            <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: "#CCFBF1", width: 92, fontSize: 13 }}>{label}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}><View style={{ height: 6, width: `${(p.bySubject[key] / largest) * 100}%`, backgroundColor: "rgba(255,255,255,0.85)" }} /></View>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, width: 84, textAlign: "right" }}>{kes(p.bySubject[key])}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      {[["Users by role", stats.users.byRole], ["Appointments by status", stats.appointments.byStatus], ["Orders by status", stats.orders.byStatus], ["Home visits by status", stats.homeVisits.byStatus]].map(([title, data]) => (
        <Card key={title as string} style={{ borderRadius: 16 }}>
          <Text variant="subheading">{title as string}</Text>
          {Object.entries(data as Record<string, number>).length === 0 ? <Text tone="faint">No data yet.</Text> : Object.entries(data as Record<string, number>).map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text tone="muted" style={{ textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</Text><Text style={{ fontFamily: "Inter_700Bold" }}>{v}</Text></View>
          ))}
        </Card>
      ))}
    </>
  );
}

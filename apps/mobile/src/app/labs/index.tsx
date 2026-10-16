import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { FlaskConical, MapPin } from "lucide-react-native";
import { KENYA_COUNTIES } from "@carebora/shared";
import type { NearbyLab } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { MpesaPay } from "@/features/MpesaPay";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { CheckRow } from "@/ui/CheckRow";
import { PhoneField } from "@/ui/PhoneField";
import { Segmented } from "@/ui/Segmented";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { useTheme } from "@/ui/theme";

export default function LabsScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const [view, setView] = useState<"browse" | "orders">("browse");
  const [county, setCounty] = useState("");
  const [lab, setLab] = useState<NearbyLab | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ id: string; amount: number } | null>(null);
  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);

  const labs = useAsync(() => (user ? api.nearbyLabs(county ? { county } : {}) : Promise.resolve(null)), [user?.id, county]);
  const tests = useAsync(() => (lab ? api.labTestsFor(lab.orgId) : Promise.resolve(null)), [lab?.orgId]);
  const orders = useAsync(() => (user ? api.listLabOrders({ limit: 50 } as never) : Promise.resolve(null)), [user?.id]);

  const total = (tests.data?.tests ?? []).filter((x) => picked.includes(x.id)).reduce((s, x) => s + x.priceKes, 0);

  async function checkout() {
    if (!lab) return;
    setBusy(true); setError(null);
    try {
      const order = await api.createLabOrder({ orgId: lab.orgId, testIds: picked, phoneNumber: phone, collectionType: "walk_in" } as never);
      if (order.payment) setPaying({ id: order.payment.id, amount: total });
      void orders.reload();
    } catch (err) { setError(errorMessage(err, "Checkout failed.")); }
    finally { setBusy(false); }
  }

  const header = <PageHeader eyebrow="Diagnostics" Icon={FlaskConical} title="Lab tests" lede="Book tests at an approved laboratory near you and get results in your medical record." />;
  if (!user) return <Screen>{header}<SignInPrompt icon="flask-outline" title="Sign in to book lab tests" hint="Results are added to your medical record." /></Screen>;

  if (paying) {
    return (
      <Screen>
        {header}
        <MpesaPay existingPaymentId={paying.id} amountKes={paying.amount} phoneHint={phone} noun="lab order" sitePath="/labs" onPaid={() => void orders.reload()} />
        <Button title="Done" variant="secondary" onPress={() => { setPaying(null); setLab(null); setPicked([]); setView("orders"); }} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }} onRefresh={async () => { await Promise.all([labs.reload(), orders.reload()]); }} refreshing={labs.refreshing}>
      {header}
      <Segmented value={view} onChange={setView} options={[{ value: "browse", label: "Browse" }, { value: "orders", label: "My orders" }]} />
      {view === "browse" ? (
        <>
          <Select label="County" value={county} options={counties} onChange={(c) => { setCounty(c); setLab(null); }} placeholder="Any county" compact />
          {labs.error && <Banner tone="danger">{labs.error}</Banner>}
          {labs.loading && !labs.data ? <View style={{ height: 160 }}><Loading /></View>
            : labs.data && labs.data.labs.length === 0 ? <Empty icon="flask-outline" title="No labs found" hint="Try a different county." />
            : labs.data?.labs.map((l) => (
              <Pressable key={l.orgId} onPress={() => { setLab(l); setPicked([]); }} accessibilityRole="button"
                style={{ borderWidth: 1.5, borderColor: lab?.orgId === l.orgId ? "#14B8A6" : t.border, backgroundColor: lab?.orgId === l.orgId ? "#F0FDFA" : "#fff", borderRadius: 16, padding: 14, gap: 4 }}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>{l.orgName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MapPin size={13} color={t.textMuted} /><Text variant="caption" tone="muted">{l.branchName}, {l.county}{l.distanceKm != null ? ` · ${l.distanceKm.toFixed(1)}km` : ""}</Text></View>
              </Pressable>
            ))}
          {lab && (
            <Card style={{ borderRadius: 24, padding: 18, gap: 10 }}>
              <Text variant="subheading">{lab.orgName} — test menu</Text>
              {tests.loading && !tests.data ? <Loading /> : (tests.data?.tests ?? []).length === 0 ? <Text tone="muted">No tests listed yet.</Text>
                : tests.data?.tests.map((x) => (
                  <CheckRow key={x.id} checked={picked.includes(x.id)} title={x.name} hint={x.category} right={kes(x.priceKes)}
                    onToggle={() => setPicked((p) => (p.includes(x.id) ? p.filter((i) => i !== x.id) : [...p, x.id]))} />
                ))}
              {picked.length > 0 && (
                <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text tone="muted">Total</Text>
                    <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>{kes(total)}</Text>
                  </View>
                  <PhoneField label="M-Pesa phone" value={phone} onChange={setPhone} lockedToKenya />
                  {error && <Banner tone="danger">{error}</Banner>}
                  <Button title={`Pay ${kes(total)}`} onPress={checkout} loading={busy} disabled={phone.length < 12} />
                </View>
              )}
            </Card>
          )}
        </>
      ) : orders.loading && !orders.data ? <Loading />
        : orders.data && orders.data.orders.length === 0 ? <Empty icon="flask-outline" title="No lab orders yet" />
        : orders.data?.orders.map((o) => (
          <Card key={o.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="subheading" style={{ flex: 1 }}>{o.organization.name}</Text>
              <Badge label={o.status.replace(/_/g, " ")} tone={o.status === "resulted" ? "ok" : o.status === "cancelled" ? "neutral" : "info"} />
            </View>
            <Text variant="caption" tone="faint">{dayTime(o.createdAt)}</Text>
            {o.items.map((i) => (
              <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text>{i.testName}</Text>
                {i.result && <Badge label={`${i.result.value}${i.result.unit ? ` ${i.result.unit}` : ""}`} tone={i.result.flag === "critical" ? "danger" : i.result.flag === "normal" ? "ok" : "warn"} />}
              </View>
            ))}
          </Card>
        ))}
    </Screen>
  );
}

import { absoluteUrl, openSite } from "@/lib/links";
import { Image, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Pill, ShieldAlert } from "lucide-react-native";
import { api } from "@/lib/api";
import { productPhotoCredit } from "@carebora/shared";
import { useAsync } from "@/lib/useAsync";
import { useCart } from "@/lib/cart";
import { kes } from "@/lib/format";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Empty, Loading } from "@/ui/parts";
import { Stepper } from "@/ui/Stepper";
import { Footer } from "@/ui/Footer";
import { categoryColors } from "@/features/categoryColors";
import { useTheme } from "@/ui/theme";

export default function DrugScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { items, add, sub, count } = useCart();
  const res = useAsync(async () => {
    const [drug, offers] = await Promise.all([api.getDrug(id), api.getDrugOffers(id, {})]);
    return { drug, offers: offers.offers };
  }, [id]);

  if (res.loading && !res.data) return <Loading />;
  if (!res.data) return <Screen><Empty icon="alert-circle-outline" title="Couldn't load this product" hint={res.error ?? undefined} action={{ label: "Back to pharmacy", onPress: () => router.replace("/pharmacy") }} /></Screen>;
  const { drug, offers } = res.data;
  const [from, to] = categoryColors(drug.category);
  const gallery = drug.images?.length ? drug.images : drug.imageUrl ? [drug.imageUrl] : [];
  const credit = productPhotoCredit(gallery[0]);

  return (
    <Screen onRefresh={res.reload} refreshing={res.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      <View style={{ height: 260, borderRadius: 24, overflow: "hidden", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", padding: 10 }}>
        {gallery[0] ? <Image source={{ uri: absoluteUrl(gallery[0]) }} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityLabel={drug.name} />
          : <LinearGradient colors={[from, to]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Pill size={80} color="rgba(255,255,255,0.9)" /></LinearGradient>}
      </View>
      <View style={{ gap: 4 }}>
        <Text style={{ color: t.textFaint, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8 }}>{drug.category.toUpperCase()}</Text>
        <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 26, lineHeight: 31 }}>{drug.name}</Text>
        {gallery.length > 0 && <Text variant="caption" tone="faint">Image for illustration. The pack you receive may look different.</Text>}
        {credit && <Text variant="caption" tone="faint" onPress={() => void openSite(credit.source)}>Photo: {credit.author}, {credit.license}</Text>}
        {drug.genericName ? <Text tone="muted">Generic: {drug.genericName}</Text> : null}
        {drug.strength ? <Text tone="muted">{drug.form ? `${drug.form} · ` : ""}{drug.strength}</Text> : null}
      </View>
      {drug.description ? <Text tone="muted" style={{ lineHeight: 23 }}>{drug.description}</Text> : null}
      {drug.requiresPrescription && (
        <View style={{ flexDirection: "row", gap: 10, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 16, padding: 14 }}>
          <ShieldAlert size={18} color="#5B21B6" />
          <Text style={{ flex: 1, color: "#5B21B6", fontSize: 14 }}>This medicine requires a valid prescription. You&apos;ll be asked to attach one at checkout.</Text>
        </View>
      )}
      <Text style={{ color: t.textFaint, fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.8 }}>
        {offers.length} PHARMAC{offers.length === 1 ? "Y" : "IES"} SELLING THIS
      </Text>
      {offers.map((o) => {
        const qty = items[o.listingId] ?? 0;
        const out = o.stockQty === 0;
        return (
          <View key={o.listingId} style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 14, gap: 10 }}>
            <View>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{o.orgName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MapPin size={13} color={t.textMuted} /><Text variant="caption" tone="muted">{o.branchName} · {o.distanceKm != null ? `${o.distanceKm.toFixed(1)}km` : o.county}</Text></View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 20 }}>{kes(o.priceKes)}</Text>
              {qty > 0 ? <Stepper qty={qty} onAdd={() => add(o.listingId)} onSub={() => sub(o.listingId)} disableAdd={out} />
                : <Button title={out ? "Out of stock" : "Add to cart"} size="sm" disabled={out} onPress={() => add(o.listingId)} />}
            </View>
          </View>
        );
      })}
      {count > 0 && <Button title={`View cart (${count})`} onPress={() => router.push("/cart")} />}
      <Footer />
    </Screen>
  );
}

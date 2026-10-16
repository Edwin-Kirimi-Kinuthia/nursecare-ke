import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Check, MapPin, Pill, Plus } from "lucide-react-native";
import { KENYA_COUNTIES } from "@carebora/shared";
import type { StorefrontDrug } from "@carebora/api-client";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useCart } from "@/lib/cart";
import { kes } from "@/lib/format";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Chip, Empty, Loading, Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { Select } from "@/ui/Select";
import { Stepper } from "@/ui/Stepper";
import { Footer } from "@/ui/Footer";
import { useTheme } from "@/ui/theme";
import { categoryColors } from "@/features/categoryColors";

export default function PharmacyScreen() {
  const [county, setCounty] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [cats, setCats] = useState<string[]>([]);

  // Debounce typing so each keystroke isn't a request.
  useEffect(() => { const h = setTimeout(() => setSearch(query.trim()), 350); return () => clearTimeout(h); }, [query]);

  const where = county ? { county } : {};
  const list = useAsync(
    () => api.searchDrugs({ limit: 50, ...(category ? { category } : {}), ...(search ? { search } : {}), ...where } as never),
    [category, search, county],
  );
  // Category chips come from the unfiltered list, so choosing one doesn't hide the others.
  useEffect(() => {
    api.searchDrugs({ limit: 50, ...where } as never).then((r) => setCats(Array.from(new Set(r.drugs.map((d) => d.category))).sort())).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [county]);

  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);

  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Pharmacy" Icon={Pill} title="Medicine, delivered" lede="Medication and supplies from licensed pharmacies near you, delivered across Kenya." />
      <Select label="Your county" value={county} options={counties} onChange={setCounty} placeholder="All of Kenya" compact />
      <SearchBox value={query} onChange={setQuery} />
      {cats.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          <Chip label="All" selected={category === ""} onPress={() => setCategory("")} />
          {cats.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>
      )}
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <View style={{ height: 240 }}><Loading /></View>
        : list.data && list.data.drugs.length === 0 ? <Empty icon="search-outline" title="No medication found" hint="Try a different search, category or location — stock varies by pharmacy." />
        : list.data?.drugs.map((d) => <DrugCard key={d.drugId} d={d} />)}
      <Footer />
    </Screen>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  return (
    <TextInput value={value} onChangeText={onChange} placeholder="Search medication…" placeholderTextColor={t.textFaint} accessibilityLabel="Search medication"
      style={{ minHeight: 48, borderWidth: 1.5, borderColor: t.border, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, color: t.text, backgroundColor: "#fff" }} />
  );
}

function DrugCard({ d }: { d: StorefrontDrug }) {
  const t = useTheme();
  const { items, add, sub } = useCart();
  const qty = items[d.listingId] ?? 0;
  const out = d.stockQty === 0;
  const low = d.stockQty > 0 && d.stockQty < 20;
  const [from, to] = categoryColors(d.category);
  const open = () => router.push({ pathname: "/pharmacy/[id]", params: { id: d.drugId } });
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`View ${d.name} details`}>
        <View style={{ height: 190, backgroundColor: "#F8FAFC" }}>
          {d.imageUrl ? <Image source={{ uri: d.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            : <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Pill size={56} color="rgba(255,255,255,0.9)" /></LinearGradient>}
          <Tag text={d.requiresPrescription ? "Rx" : "OTC"} fg={d.requiresPrescription ? "#6D28D9" : "#047857"} style={{ position: "absolute", left: 12, top: 12 }} />
          {qty > 0 && <View style={{ position: "absolute", right: 12, top: 12, flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "#0D9488", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Check size={12} color="#fff" /><Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }}>{qty}</Text></View>}
          {out && <Tag text="Out of stock" bg="#E11D48" fg="#fff" style={{ position: "absolute", left: 12, bottom: 12 }} />}
          {low && <Tag text={`Only ${d.stockQty} left`} bg="#F59E0B" fg="#fff" style={{ position: "absolute", left: 12, bottom: 12 }} />}
        </View>
        <View style={{ padding: 16, paddingBottom: 6, gap: 3 }}>
          <Text style={{ color: t.textFaint, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.8 }}>{d.category.toUpperCase()}</Text>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17 }}>{d.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MapPin size={13} color={t.textMuted} />
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              {d.nearestVendor.orgName}{d.nearestVendor.distanceKm != null ? ` · ${d.nearestVendor.distanceKm.toFixed(1)}km` : ` · ${d.nearestVendor.county}`}{d.vendorCount > 1 ? ` · +${d.vendorCount - 1} more` : ""}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 8 }}>
        <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 20 }}>{kes(d.bestPriceKes)}</Text>
        {qty > 0 ? <Stepper qty={qty} onAdd={() => add(d.listingId)} onSub={() => sub(d.listingId)} disableAdd={out} />
          : <Pressable onPress={() => add(d.listingId)} disabled={out} accessibilityRole="button" accessibilityLabel={`Add ${d.name} to cart`}
              style={{ flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: out ? "#CBD5E1" : "#0D9488", borderRadius: 14, paddingHorizontal: 18, height: 42 }}>
              <Plus size={16} color="#fff" /><Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Add</Text>
            </Pressable>}
      </View>
    </View>
  );
}

function Tag({ text, bg = "rgba(255,255,255,0.95)", fg, style }: { text: string; bg?: string; fg: string; style?: object }) {
  return <View style={[{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }, style]}><Text style={{ color: fg, fontFamily: "Inter_700Bold", fontSize: 12 }}>{text}</Text></View>;
}

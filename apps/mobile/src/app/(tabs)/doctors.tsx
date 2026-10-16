import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight, MapPin, Star, Stethoscope } from "lucide-react-native";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { kes } from "@/lib/format";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Chip, Empty, Loading, Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { ProviderBanner } from "@/ui/Banner";
import { Footer } from "@/ui/Footer";
import { Button } from "@/ui/Button";
import { useTheme } from "@/ui/theme";
import { AvailabilityDot } from "@/features/AvailabilityDot";

export default function DoctorsScreen() {
  const [specialty, setSpecialty] = useState("");
  const [chips, setChips] = useState<{ name: string; count: number }[]>([]);

  // Specialties come from what providers have actually entered, never a fixed list.
  useEffect(() => {
    api.listSpecialties().then((r) => setChips(r.specialties)).catch(() => {});
  }, []);

  const list = useAsync(() => api.listProviders({ limit: 30, ...(specialty ? { specialty } : {}) }), [specialty]);

  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Care providers" Icon={Stethoscope} title="Find your provider" lede="Licensed clinicians across Kenya. Every provider here has had their practice licence checked." />
      {chips.length >= 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          <Chip label="All" selected={specialty === ""} onPress={() => setSpecialty("")} />
          {chips.map((c) => (
            <Chip key={c.name} label={`${c.name} · ${c.count}`} selected={specialty === c.name} onPress={() => setSpecialty(c.name)} />
          ))}
        </ScrollView>
      )}
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? (
        <View style={{ height: 240 }}><Loading /></View>
      ) : list.data && list.data.providers.length === 0 ? (
        <Empty icon="search-outline" title="No doctors match that filter" hint="Try another specialty, or choose All." />
      ) : (
        list.data?.providers.map((p) => <DoctorCard key={p.userId} p={p} />)
      )}
      <Footer />
    </Screen>
  );
}

function DoctorCard({ p }: { p: ProviderPublicProfile }) {
  const t = useTheme();
  const place = [p.town?.trim(), p.county?.trim()].filter(Boolean).join(", ");
  const open = () => router.push({ pathname: "/provider/[id]", params: { id: p.userId } });
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${p.user.fullName}, ${p.specialty ?? "clinician"}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}>
        <ProviderBanner name={p.user.fullName} uri={p.user.avatarUrl} />
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 6 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 19, letterSpacing: -0.3 }}>{p.user.fullName}</Text>
          <Text style={{ color: "#0F766E", fontSize: 16 }}>{p.specialty ?? "Clinician"}{p.subSpecialty ? ` · ${p.subSpecialty}` : ""}</Text>
          <AvailabilityDot available={p.isAvailable} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={17} color="#F59E0B" fill={i <= Math.round(p.ratingAvg) ? "#F59E0B" : "transparent"} />)}
            </View>
            <Text tone="faint" style={{ fontSize: 14 }}>{p.ratingCount > 0 ? `${p.ratingAvg} · ${p.ratingCount} ${p.ratingCount === 1 ? "review" : "reviews"}` : "New"}</Text>
          </View>
          {place ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MapPin size={16} color={t.textMuted} />
              <Text tone="muted" style={{ fontSize: 15 }}>{place}</Text>
            </View>
          ) : null}
          <View style={{ height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text tone="faint" style={{ fontSize: 14 }}>Consultation</Text>
              <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 20 }}>{kes(p.consultationFeeKes)}</Text>
            </View>
            <Button title="Book" size="sm" icon={<ArrowRight size={16} color="#fff" />} onPress={open} style={{ paddingHorizontal: 22 }} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

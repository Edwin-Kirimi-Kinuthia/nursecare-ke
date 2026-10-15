import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ProviderPublicProfile } from "@carebora/api-client";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { kes } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Avatar, Chip, Empty, Loading, Stars, Banner } from "@/ui/parts";
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
    <Screen onRefresh={list.reload} refreshing={list.refreshing}>
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
    </Screen>
  );
}

function DoctorCard({ p }: { p: ProviderPublicProfile }) {
  const place = [p.town?.trim(), p.county?.trim()].filter(Boolean).join(", ");
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/provider/[id]", params: { id: p.userId } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.user.fullName}, ${p.specialty ?? "clinician"}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Avatar name={p.user.fullName} uri={p.user.avatarUrl} size={60} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="subheading">{p.user.fullName}</Text>
            <Text tone="primary" variant="label">
              {p.specialty ?? "Clinician"}{p.subSpecialty ? ` · ${p.subSpecialty}` : ""}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Stars value={p.ratingAvg} />
              <Text variant="caption" tone="faint">{p.ratingCount > 0 ? `${p.ratingAvg} (${p.ratingCount})` : "New"}</Text>
            </View>
            {place ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={13} color="#94A3B8" />
                <Text variant="caption" tone="muted">{place}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <AvailabilityDot available={p.isAvailable} />
          <Text variant="subheading">{kes(p.consultationFeeKes)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MapPin, ShieldCheck, Star } from "lucide-react-native";
import type { Slot } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { dayLabel, kes, timeAgo, timeOnly } from "@/lib/format";
import { AvailabilityDot } from "@/features/AvailabilityDot";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Badge, Banner, Chip, Empty, Loading, Stars } from "@/ui/parts";
import { ProviderBanner } from "@/ui/Banner";
import { Footer } from "@/ui/Footer";
import { useTheme } from "@/ui/theme";

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { user } = useAuth();
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  const profile = useAsync(() => api.getProvider(id), [id]);
  const slots = useAsync(() => api.listSlots(id, { type: "teleconsult" }), [id]);
  const reviews = useAsync(() => api.listProviderReviews(id, { limit: 5, offset: 0 }), [id]);

  if (profile.loading && !profile.data) return <Loading />;
  if (profile.error || !profile.data) {
    return <Screen><Empty icon="alert-circle-outline" title="Couldn't load this doctor" hint={profile.error ?? "They may no longer be listed."} action={{ label: "Back to doctors", onPress: () => router.replace("/doctors") }} /></Screen>;
  }

  const p = profile.data;
  const place = [p.town?.trim(), p.county?.trim()].filter(Boolean).join(", ");
  const days = groupByDay(slots.data ?? []);
  const isSelf = user?.id === p.userId;

  async function book() {
    if (!chosen) return;
    if (!user) { router.push("/login"); return; }
    setBooking(true);
    setError(null);
    try {
      const appt = await api.createAppointment({ slotId: chosen.id });
      // Confirmed on the spot (the doctor is available): the fee is what lets
      // the patient be seen, so go straight to paying it.
      if (appt.status === "confirmed" && appt.feeKes > 0) {
        router.replace({ pathname: "/appointment/[id]", params: { id: appt.id, pay: "1" } });
        return;
      }
      setRequested(true);
      setChosen(null);
      void slots.reload();
    } catch (err) {
      setError(errorMessage(err));
      void slots.reload(); // the time may just have been taken
      setChosen(null);
    } finally {
      setBooking(false);
    }
  }

  return (
    <Screen onRefresh={async () => { await Promise.all([profile.reload(), slots.reload(), reviews.reload()]); }} refreshing={profile.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}>
        <ProviderBanner name={p.user.fullName} uri={p.user.avatarUrl} height={112} />
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 8 }}>
          <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 24, letterSpacing: -0.4 }}>{p.user.fullName}</Text>
          <Text style={{ color: "#0F766E", fontSize: 16 }}>{p.specialty ?? "Clinician"}{p.subSpecialty ? ` · ${p.subSpecialty}` : ""}</Text>
          <AvailabilityDot available={p.isAvailable} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={17} color="#F59E0B" fill={i <= Math.round(p.ratingAvg) ? "#F59E0B" : "transparent"} />)}
            </View>
            <Text tone="faint" style={{ fontSize: 14 }}>{p.ratingCount > 0 ? `${p.ratingAvg} · ${p.ratingCount} ${p.ratingCount === 1 ? "review" : "reviews"}` : "No reviews yet"}</Text>
          </View>
          {place ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MapPin size={16} color={t.textMuted} />
              <Text tone="muted">{place}</Text>
            </View>
          ) : null}
          {(p.licenceBody || p.licenceNumber) && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={16} color="#047857" />
              <Text variant="caption" tone="muted">Licensed{p.licenceBody ? ` by ${p.licenceBody}` : ""}{p.licenceNumber ? ` · No. ${p.licenceNumber}` : ""}</Text>
            </View>
          )}
          <View style={{ backgroundColor: "#F0FDFA", borderRadius: 16, padding: 14, marginTop: 6 }}>
            <Text style={{ color: "#0F766E", fontSize: 13 }}>Consultation</Text>
            <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>{kes(p.consultationFeeKes)}</Text>
          </View>
          {p.bio ? <Text tone="muted" style={{ marginTop: 6, lineHeight: 23 }}>{p.bio}</Text> : null}
          {(p.languages?.length ?? 0) > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {p.languages.map((l) => <Badge key={l} label={l} />)}
            </View>
          )}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 22 }}>Book a teleconsultation</Text>
        <Text tone="muted">
          {p.isAvailable
            ? `Pick a time and pay the ${kes(p.consultationFeeKes)} fee with M-Pesa to confirm. You'll be seen at your slot.`
            : `${p.user.fullName} is with another patient right now. You can still pick a time: they confirm it, then you pay the ${kes(p.consultationFeeKes)} fee and are seen at your slot.`}
        </Text>
      </View>

      {error && <Banner tone="danger">{error}</Banner>}
      {requested && <Banner tone="ok">Request sent. We&apos;ll notify you when the doctor confirms, and you can pay then.</Banner>}
      {isSelf && <Banner tone="info">This is your own profile, so you can&apos;t book yourself.</Banner>}

      {slots.loading && !slots.data ? (
        <Loading />
      ) : days.length === 0 ? (
        <Empty icon="time-outline" title="No open times right now" hint="Check back soon." />
      ) : (
        days.map(([day, list]) => (
          <View key={day} style={{ gap: 8 }}>
            <Text variant="label" tone="muted">{day}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {list.map((s) => <Chip key={s.id} label={timeOnly(s.startsAt)} selected={chosen?.id === s.id} onPress={() => !isSelf && setChosen(s)} />)}
            </View>
          </View>
        ))
      )}

      {chosen && (
        <Card>
          <Text variant="subheading">{dayLabel(chosen.startsAt)}, {timeOnly(chosen.startsAt)}</Text>
          <Text tone="muted">{p.isAvailable ? `Fee ${kes(p.consultationFeeKes)}, paid next.` : "The doctor confirms first; you pay after that."}</Text>
          <Button title={user ? (p.isAvailable ? "Book and pay" : "Request this time") : "Sign in to book"} onPress={book} loading={booking} />
        </Card>
      )}

      <Text variant="heading" style={{ marginTop: 8 }}>Patient reviews</Text>
      {reviews.data && reviews.data.reviews.length > 0 ? (
        reviews.data.reviews.map((r) => (
          <Card key={r.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Stars value={r.rating} />
              <Text variant="caption" tone="faint">{timeAgo(r.createdAt)}</Text>
            </View>
            {r.comment ? <Text>{r.comment}</Text> : null}
            <Text variant="caption" tone="muted">{r.patient.fullName}</Text>
          </Card>
        ))
      ) : (
        <Text tone="muted">No reviews yet. Patients can review a doctor after a completed consultation.</Text>
      )}
      <Footer />
    </Screen>
  );
}

function groupByDay(slots: Slot[]) {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = dayLabel(s.startsAt);
    (map.get(key) ?? map.set(key, []).get(key)!).push(s);
  }
  return [...map.entries()].slice(0, 5);
}

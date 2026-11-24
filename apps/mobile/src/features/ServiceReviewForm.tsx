import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { ServiceReviewSubject } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { Card } from "@/ui/Screen";

export function ServiceReviewForm({ serviceType, subjectId, label }: ServiceReviewSubject & { label: string }) {
  const current = useAsync(() => api.getServiceReview({ serviceType, subjectId }), [serviceType, subjectId]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!rating || busy) return;
    setBusy(true); setError("");
    try { await api.createServiceReview({ serviceType, subjectId, rating, comment: comment.trim() }); await current.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not submit your review"); }
    finally { setBusy(false); }
  }
  if (current.loading) return <Text tone="muted">Loading review…</Text>;
  if (current.error) return <Card><Banner tone="danger">{current.error}</Banner><Button title="Retry review" onPress={current.reload} /></Card>;
  if (current.data) return <Banner tone="ok">Thank you! You rated {label} {current.data.rating}/5 stars.</Banner>;
  return <Card>
    <Text variant="subheading">Rate {label}</Text>
    <Text variant="caption" tone="muted">Share your service experience. Keep medical details out of your public review.</Text>
    <View style={{ flexDirection: "row", gap: 4 }}>{[1,2,3,4,5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? "star" : "stars"}`} accessibilityState={{ selected: rating === n }} onPress={() => setRating(n)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 32, color: n <= rating ? "#B45309" : "#64748B" }}>{n <= rating ? "★" : "☆"}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel={`Review ${label}`} multiline maxLength={1000} value={comment} onChangeText={setComment} placeholder="Tell us about the service (optional)" style={{ minHeight: 80, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, color: "#0F172A", textAlignVertical: "top" }} />
    {error && <Banner tone="danger">{error}</Banner>}
    <Button title="Submit review" disabled={!rating} loading={busy} onPress={submit} />
  </Card>;
}

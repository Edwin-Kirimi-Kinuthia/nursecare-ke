import { useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
export function OrganizationReviews({ orgId, name }: { orgId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 8 }}><Button title={open ? "Hide reviews" : `Reviews of ${name}`} size="sm" variant="secondary" onPress={() => setOpen(!open)} />{open && <Reviews orgId={orgId} />}</View>;
}
function Reviews({ orgId }: { orgId: string }) {
  const result = useAsync(() => api.listOrganizationReviews(orgId), [orgId]);
  if (result.error) return <><Banner tone="danger">{result.error}</Banner><Button title="Retry reviews" onPress={result.reload} /></>;
  if (!result.data) return <Text tone="muted">Loading reviews…</Text>;
  return <View style={{ gap: 8 }}><Text>{result.data.ratingCount ? `★ ${result.data.ratingAvg.toFixed(1)} · ${result.data.ratingCount} verified reviews` : "No reviews yet"}</Text>{result.data.reviews.map(r => <View key={r.id} style={{ padding: 12, borderRadius: 12, backgroundColor: "#F8FAFC", gap: 4 }}><Text>{r.rating}/5 stars · Verified service</Text>{r.comment ? <Text tone="muted">{r.comment}</Text> : null}</View>)}</View>;
}

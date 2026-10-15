import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { Card } from "@/ui/Screen";
import { radius, useTheme } from "@/ui/theme";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Rate a completed appointment. The rating is required; the comment isn't, because asking for prose is what stops most people rating at all. */
export function ReviewForm({ appointmentId, providerName, onDone }: { appointmentId: string; providerName: string; onDone: () => void }) {
  const t = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.createReview(appointmentId, { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text variant="subheading">How was your visit with {providerName}?</Text>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable key={i} onPress={() => setRating(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${i} star${i > 1 ? "s" : ""}, ${LABELS[i]}`} accessibilityState={{ selected: rating === i }}>
            <Ionicons name={i <= rating ? "star" : "star-outline"} size={34} color={i <= rating ? t.star : t.textFaint} />
          </Pressable>
        ))}
        <Text tone="muted" style={{ marginLeft: 6 }}>{LABELS[rating] || "Tap to rate"}</Text>
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Add a comment (optional)"
        placeholderTextColor={t.textFaint}
        multiline
        maxLength={1000}
        accessibilityLabel="Comment"
        style={{ minHeight: 84, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.md, padding: 12, fontSize: 15, color: t.text, backgroundColor: t.surface, textAlignVertical: "top" }}
      />
      <Text variant="caption" tone="faint">Shown on the doctor&apos;s profile with your name.</Text>
      {error && <Banner tone="danger">{error}</Banner>}
      <Button title="Submit review" onPress={submit} loading={busy} disabled={rating === 0} />
    </Card>
  );
}

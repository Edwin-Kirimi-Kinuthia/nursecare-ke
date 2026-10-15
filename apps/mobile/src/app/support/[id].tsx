import { useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { dayTime } from "@/lib/format";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner, Empty, Loading } from "@/ui/parts";
import { radius, useTheme } from "@/ui/theme";

export default function SupportThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const thread = useAsync(() => api.getSupportTicket(id), [id]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (thread.loading && !thread.data) return <Loading />;
  if (!thread.data) return <Screen><Empty icon="alert-circle-outline" title="Couldn't load this conversation" hint={thread.error ?? undefined} /></Screen>;
  const tk = thread.data;

  async function send() {
    setBusy(true);
    setError(null);
    try { await api.replySupportTicket(id, { body: reply.trim() }); setReply(""); await thread.reload(); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <Screen onRefresh={thread.reload} refreshing={thread.refreshing}>
      <Text variant="heading">{tk.subject}</Text>
      {tk.messages.map((m) => (
        <View key={m.id} style={{ alignSelf: m.fromStaff ? "flex-start" : "flex-end", maxWidth: "88%", backgroundColor: m.fromStaff ? t.surface : t.primary, borderRadius: radius.md, borderWidth: m.fromStaff ? 1 : 0, borderColor: t.border, padding: 12, gap: 2 }}>
          <Text variant="caption" style={{ color: m.fromStaff ? t.primarySoftText : t.onPrimary, fontWeight: "700" }}>{m.fromStaff ? "Care Bora" : "You"}</Text>
          <Text style={{ color: m.fromStaff ? t.text : t.onPrimary }}>{m.body}</Text>
          <Text variant="caption" style={{ color: m.fromStaff ? t.textFaint : t.onPrimary, opacity: 0.8 }}>{dayTime(m.createdAt)}</Text>
        </View>
      ))}
      {tk.status === "closed" ? (
        <Banner tone="info">This conversation is closed. Send a new message if you need anything else.</Banner>
      ) : (
        <>
          {error && <Banner tone="danger">{error}</Banner>}
          <TextInput
            value={reply} onChangeText={setReply} multiline maxLength={4000} placeholder="Write a reply" placeholderTextColor={t.textFaint} accessibilityLabel="Reply"
            style={{ minHeight: 90, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.md, padding: 12, fontSize: 15, color: t.text, backgroundColor: t.surface, textAlignVertical: "top" }}
          />
          <Button title="Send reply" onPress={send} loading={busy} disabled={!reply.trim()} />
        </>
      )}
    </Screen>
  );
}

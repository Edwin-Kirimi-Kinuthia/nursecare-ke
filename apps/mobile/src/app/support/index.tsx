import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_STATUS_LABELS } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { timeAgo } from "@/lib/format";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";

const TONE = { open: "info", in_progress: "warn", awaiting_client: "warn", resolved: "ok", closed: "neutral" } as const;

export default function SupportList() {
  const { user } = useAuth();
  const list = useAsync(async () => (user ? (await api.listMySupportTickets({ limit: 50 })).tickets : []), [user?.id]);

  if (!user) return <Screen><SignInPrompt title="Your messages" hint="Sign in to follow your conversations with our team." /></Screen>;
  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing}>
      <Button title="New message" onPress={() => router.push("/support/new")} />
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <View style={{ height: 200 }}><Loading /></View>
        : (list.data ?? []).length === 0 ? <Empty icon="chatbubbles-outline" title="No messages yet" hint="Ask a question or request a medical document." />
        : list.data!.map((tk) => (
          <Pressable key={tk.id} onPress={() => router.push({ pathname: "/support/[id]", params: { id: tk.id } })} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="subheading" numberOfLines={1}>{tk.subject}</Text>
                  <Text variant="caption" tone="muted">{SUPPORT_CATEGORY_LABELS[tk.category]} · {timeAgo(tk.lastReplyAt)}</Text>
                </View>
                <Badge label={SUPPORT_STATUS_LABELS[tk.status]} tone={TONE[tk.status]} />
              </View>
            </Card>
          </Pressable>
        ))}
    </Screen>
  );
}

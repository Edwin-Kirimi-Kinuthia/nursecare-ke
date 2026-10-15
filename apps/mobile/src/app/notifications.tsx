import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { timeAgo } from "@/lib/format";
import { routeForLink } from "@/lib/push";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner, Empty, Loading } from "@/ui/parts";
import { useTheme } from "@/ui/theme";

export default function NotificationsScreen() {
  const t = useTheme();
  const list = useAsync(() => api.listNotifications(), []);
  const items = list.data?.notifications ?? [];

  async function open(id: string, link: string | null, read: boolean) {
    if (!read) { void api.markNotificationRead(id).catch(() => {}); }
    const to = routeForLink(link);
    if (to) router.push(to as never);
    void list.reload();
  }

  return (
    <Screen onRefresh={list.reload} refreshing={list.refreshing}>
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {(list.data?.unreadCount ?? 0) > 0 && (
        <Button title="Mark all as read" variant="secondary" size="sm" onPress={async () => { await api.markAllNotificationsRead(); await list.reload(); }} />
      )}
      {list.loading && !list.data ? <View style={{ height: 200 }}><Loading /></View>
        : items.length === 0 ? <Empty icon="notifications-outline" title="You're all caught up" hint="Updates about your appointments will appear here." />
        : items.map((n) => (
          <Pressable key={n.id} onPress={() => open(n.id, n.link, !!n.readAt)} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <Card style={{ borderColor: n.readAt ? t.border : t.primary }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {!n.readAt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.primary, marginTop: 7 }} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="subheading">{n.title}</Text>
                  {n.body ? <Text tone="muted">{n.body}</Text> : null}
                  <Text variant="caption" tone="faint">{timeAgo(n.createdAt)}</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
    </Screen>
  );
}

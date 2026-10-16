import { useState } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import { SUPPORT_CATEGORY_LABELS, SUPPORT_DOCUMENT_LABELS, SUPPORT_STATUS_LABELS, type SupportStatus } from "@carebora/shared";
import type { SupportTicket } from "@carebora/api-client";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAct } from "@/lib/useAct";
import { dayTime } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Badge, Banner, Chip, Empty, Loading } from "@/ui/parts";
import { useTheme } from "@/ui/theme";

const FILTERS: (SupportStatus | "all")[] = ["all", "open", "in_progress", "awaiting_client", "resolved", "closed"];
const TONE: Record<string, "info" | "warn" | "neutral" | "ok"> = { open: "info", in_progress: "warn", awaiting_client: "neutral", resolved: "ok", closed: "neutral" };

/** The admin support inbox: every message, reply inline, change status. */
export function SupportAdmin() {
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const list = useAsync(() => api.adminListSupportTickets({ limit: 100, ...(filter === "all" ? {} : { status: filter }) } as never), [filter]);
  const [openId, setOpenId] = useState<string | null>(null);
  const tickets = list.data?.tickets ?? [];
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f} label={f === "all" ? `All${list.data?.openCount ? ` · ${list.data.openCount} open` : ""}` : SUPPORT_STATUS_LABELS[f]} selected={filter === f} onPress={() => setFilter(f)} />)}
      </ScrollView>
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : tickets.length === 0 ? <Empty icon="chatbubbles-outline" title="No messages here" /> : tickets.map((t) => (
        <Ticket key={t.id} ticket={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onChanged={list.reload} />
      ))}
    </>
  );
}

function Ticket({ ticket, open, onToggle, onChanged }: { ticket: SupportTicket; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const t = useTheme();
  const [reply, setReply] = useState("");
  const { busy, err, run } = useAct();
  const unanswered = !ticket.messages[ticket.messages.length - 1]?.fromStaff;
  return (
    <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: unanswered ? "#5EEAD4" : t.border, borderRadius: 16, overflow: "hidden" }}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ padding: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontFamily: "Inter_700Bold", flex: 1 }} numberOfLines={1}>{ticket.subject}</Text>
          <Badge label={SUPPORT_STATUS_LABELS[ticket.status]} tone={TONE[ticket.status] ?? "neutral"} />
        </View>
        {unanswered && <Badge label="Needs reply" tone="info" />}
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {SUPPORT_CATEGORY_LABELS[ticket.category]}{ticket.documentType ? ` · ${SUPPORT_DOCUMENT_LABELS[ticket.documentType]}` : ""} · {ticket.contactName}{!ticket.userId ? " (no account)" : ""} · {dayTime(ticket.lastReplyAt)}
        </Text>
      </Pressable>
      {open && (
        <View style={{ padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", backgroundColor: "#F8FAFC" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Text onPress={() => void Linking.openURL(`mailto:${ticket.contactEmail}`)} variant="caption" style={{ color: "#0F766E" }}>{ticket.contactEmail}</Text>
            {ticket.contactPhone ? <Text onPress={() => void Linking.openURL(`tel:${ticket.contactPhone}`)} variant="caption" style={{ color: "#0F766E" }}>{ticket.contactPhone}</Text> : null}
            <Text variant="caption" tone="faint">Ref {ticket.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          {ticket.messages.map((m) => (
            <View key={m.id} style={{ alignSelf: m.fromStaff ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: m.fromStaff ? "#0D9488" : "#fff", borderWidth: m.fromStaff ? 0 : 1, borderColor: t.border, borderRadius: 14, padding: 10, gap: 2 }}>
              <Text variant="caption" style={{ color: m.fromStaff ? "#CCFBF1" : t.textMuted, fontFamily: "Inter_700Bold" }}>{m.fromStaff ? (m.sender?.fullName ?? "Care Bora") : ticket.contactName}</Text>
              <Text style={{ color: m.fromStaff ? "#fff" : t.text }}>{m.body}</Text>
              <Text variant="caption" style={{ color: m.fromStaff ? "#99F6E4" : t.textFaint }}>{dayTime(m.createdAt)}</Text>
            </View>
          ))}
          {ticket.status !== "closed" && (
            <>
              <TextInput value={reply} onChangeText={setReply} multiline maxLength={4000} placeholder="Reply to the client…" placeholderTextColor={t.textFaint} accessibilityLabel="Reply"
                style={{ minHeight: 70, borderWidth: 1.5, borderColor: t.border, borderRadius: 12, padding: 10, fontSize: 15, color: t.text, backgroundColor: "#fff", textAlignVertical: "top" }} />
              <Button title="Send reply" size="sm" loading={busy === "r"} disabled={!reply.trim()} onPress={() => run("r", () => api.replySupportTicket(ticket.id, { body: reply.trim() }), () => { setReply(""); onChanged(); })} />
            </>
          )}
          {err && <Banner tone="danger">{err}</Banner>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["in_progress", "resolved", "closed", "open"] as SupportStatus[]).filter((s) => s !== ticket.status).map((s) => (
              <Button key={s} title={`Mark ${SUPPORT_STATUS_LABELS[s].toLowerCase()}`} variant="secondary" size="sm" loading={busy === s} onPress={() => run(s, () => api.adminPatchSupportTicket(ticket.id, { status: s }), onChanged)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, PermissionsAndroid, Platform, Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Message } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { timeOnly } from "@/lib/format";
import { VideoRoom } from "@/features/VideoRoom";
import { ConsultPanel } from "@/features/ConsultPanel";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Loading } from "@/ui/parts";
import { radius, useTheme } from "@/ui/theme";

type Joined = { token: string; url: string; consultationId: string; otherName: string; isProvider: boolean };

export default function ConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string; appointmentId?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [joined, setJoined] = useState<Joined | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef(0);
  const chatOpenRef = useRef(false);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  const messageCount = useRef(0);
  useEffect(() => { messageCount.current = messages.length; }, [messages.length]);

  // Opening the chat marks everything read. Done in the handler, where the tap
  // is, rather than in an effect that reacts to it.
  const toggleChat = useCallback(() => {
    setChatOpen((open) => {
      if (!open) { setUnread(0); seen.current = messageCount.current; }
      return !open;
    });
  }, []);

  // Ask for camera and microphone, fetch a join token, then connect. iOS asks
  // by itself the first time the camera starts; Android must be asked up front.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (Platform.OS === "android") {
          const r = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
          if (Object.values(r).some((v) => v !== PermissionsAndroid.RESULTS.GRANTED)) {
            throw new Error("Care Bora needs camera and microphone access for the video call. You can allow it in your phone's Settings, then try again.");
          }
        }
        const [c, tok] = await Promise.all([api.getConsultation(id), api.getLivekitToken(id, user?.fullName)]);
        if (!tok.livekitUrl) throw new Error("Video calls aren't available right now. Please try again shortly.");
        const isProvider = c.appointment?.providerId === user?.id;
        const appt = c.appointment ? await api.getAppointment(c.appointmentId) : null;
        const otherName = appt ? (isProvider ? appt.patient.fullName : appt.provider.user.fullName) : "the other person";
        if (live) setJoined({ token: tok.token, url: tok.livekitUrl, consultationId: c.id, otherName, isProvider });
      } catch (err) {
        if (live) setError(err instanceof Error && !(err as { code?: string }).code ? err.message : errorMessage(err));
      }
    })();
    return () => { live = false; };
  }, [id, user?.id, user?.fullName]);

  // Chat: refreshed every few seconds while the call is up.
  const poll = useCallback(async () => {
    try {
      const list = await api.listMessages(id);
      setMessages(list);
      if (!chatOpenRef.current) setUnread(Math.max(0, list.length - seen.current));
    } catch { /* offline for a moment — try again next tick */ }
  }, [id]);
  useEffect(() => {
    if (!joined) return;
    const first = setTimeout(poll, 0);
    const timer = setInterval(poll, 4000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [joined, poll]);

  const leave = useCallback(() => { if (router.canGoBack()) router.back(); else router.replace("/appointments"); }, []);

  const end = () =>
    Alert.alert("End this consultation?", "This closes the call for both of you and completes the appointment.", [
      { text: "Keep going", style: "cancel" },
      {
        text: "End consultation", style: "destructive",
        onPress: async () => {
          try {
            // The server marks the appointment completed as part of this.
            await api.patchConsultation(id, { status: "ended" });
            leave();
          } catch (err) { Alert.alert("Couldn't end the consultation", errorMessage(err)); }
        },
      },
    ]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B1215", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
        <Ionicons name="videocam-off-outline" size={42} color="#94A3B8" />
        <Text style={{ color: "#E2E8F0", textAlign: "center" }}>{error}</Text>
        <View style={{ alignSelf: "stretch" }}><Button title="Go back" variant="secondary" onPress={leave} /></View>
      </View>
    );
  }
  if (!joined) return <View style={{ flex: 1, backgroundColor: "#0B1215", paddingTop: insets.top }}><Loading label="Joining your consultation…" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1215", paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <VideoRoom
        serverUrl={joined.url}
        token={joined.token}
        otherName={joined.otherName}
        canEnd={joined.isProvider}
        chatOpen={chatOpen}
        unread={unread}
        onToggleChat={toggleChat}
        onLeave={leave}
        onEnd={end}
      >
        <ConsultPanel consultationId={joined.consultationId} role={user?.role ?? ""} isProvider={joined.isProvider}
          chat={<Chat consultationId={joined.consultationId} messages={messages} meId={user?.id ?? ""} onSent={poll} />} />
      </VideoRoom>
    </View>
  );
}

function Chat({ consultationId, messages, meId, onSent }: { consultationId: string; messages: Message[]; meId: string; onSent: () => void }) {
  const t = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList<Message>>(null);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await api.sendMessage(consultationId, { content });
      setText("");
      onSent();
    } catch (err) {
      Alert.alert("Message not sent", errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text tone="muted" style={{ textAlign: "center", marginTop: 20 }}>No messages yet. Say hello.</Text>}
        renderItem={({ item }) => {
          const mine = item.senderId === meId;
          return (
            <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", backgroundColor: mine ? t.primary : t.surface, borderRadius: radius.md, borderWidth: mine ? 0 : 1, borderColor: t.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: mine ? t.onPrimary : t.text }}>{item.content}</Text>
              <Text variant="caption" style={{ color: mine ? t.onPrimary : t.textFaint, opacity: 0.8, marginTop: 2 }}>{timeOnly(item.createdAt)}</Text>
            </View>
          );
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: t.border }}>
        <TextInput
          value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor={t.textFaint}
          maxLength={2000} onSubmitEditing={send} returnKeyType="send" accessibilityLabel="Message"
          style={{ flex: 1, minHeight: 44, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.pill, paddingHorizontal: 16, fontSize: 15, color: t.text, backgroundColor: t.surface }}
        />
        <Pressable onPress={send} disabled={sending || !text.trim()} accessibilityRole="button" accessibilityLabel="Send message"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", opacity: sending || !text.trim() ? 0.5 : 1 }}>
          <Ionicons name="send" size={19} color={t.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

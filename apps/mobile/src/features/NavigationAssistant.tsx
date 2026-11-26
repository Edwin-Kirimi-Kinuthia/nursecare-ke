import { useEffect, useRef, useState, type ComponentRef } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, usePathname } from "expo-router";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, ErrorCode, ASSISTANT_GREETING, assistantHistory, navigationActions, type NavigationReply, type NavigationTurn } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";

type Turn = NavigationTurn & { reply?: NavigationReply };
const welcome = (): Turn[] => [{ role: "assistant", content: ASSISTANT_GREETING.message, reply: ASSISTANT_GREETING }];
export function NavigationAssistant() {
  const { user } = useAuth();
  return <Assistant key={`${user?.id ?? "guest"}:${user?.role ?? "guest"}`} signedIn={Boolean(user)} />;
}
function Assistant({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(welcome);
  const pending = useRef(false), sequence = useRef(0), log = useRef<ComponentRef<typeof ScrollView>>(null), input = useRef<ComponentRef<typeof TextInput>>(null);
  const latest = turns.at(-1)?.reply;
  const [shake] = useState(() => new Animated.Value(0));
  const hidden = pathname.startsWith("/consultation/");
  useEffect(() => {
    if (hidden || open) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(async () => {
      if (await AccessibilityInfo.isReduceMotionEnabled() || cancelled || AppState.currentState !== "active") return;
      animation = Animated.sequence([-6, 6, -6, 6, 0].map(toValue => Animated.timing(shake, { toValue, duration: 100, useNativeDriver: true })));
      animation.start();
    }, 30_000);
    return () => { cancelled = true; clearTimeout(timer); animation?.stop(); shake.setValue(0); };
  }, [hidden, open, shake]);
  function reset() { sequence.current++; pending.current = false; setBusy(false); setTurns(welcome()); setQuestion(""); input.current?.focus(); }
  async function ask(value = question) {
    const message = value.trim(); if (pending.current || !message) return;
    const request = ++sequence.current; pending.current = true; setBusy(true); setQuestion("");
    setTurns(current => [...current, { role: "user" as const, content: message }].slice(-24));
    try {
      // Refresh expired credentials before a public assistant request needs private account data.
      if (signedIn) await api.me();
      const reply = await api.navigateAssistant(message, { history: assistantHistory(turns), page: pathname });
      if (request === sequence.current) setTurns(current => [...current, { role: "assistant" as const, content: reply.message, reply }].slice(-24));
    } catch (error) {
      if (request === sequence.current) {
        const expired = error instanceof ApiError && error.code === ErrorCode.UNAUTHORIZED;
        const reply: NavigationReply = { message: expired ? "Your session has ended. Sign in again to check your personal orders. You can still ask general service questions." : "I couldn't connect just now. Your question is ready to retry, or you can contact the team below.", serviceIds: expired ? ["signin", "support"] : ["support"], source: "guide", suggestions: [] };
        setTurns(current => [...current, { role: "assistant" as const, content: reply.message, reply }].slice(-24)); setQuestion(message);
      }
    } finally { if (request === sequence.current) { pending.current = false; setBusy(false); } }
  }
  if (hidden) return null;
  return <>
    <Animated.View style={{ position: "absolute", right: 12, bottom: insets.bottom + 76, transform: [{ translateX: shake }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open navigation assistant" onPress={() => setOpen(true)} style={{ backgroundColor: "#234F34", width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", elevation: 3 }}><MessageCircle size={29} fill="white" color="#234F34" strokeWidth={1.5} /><View pointerEvents="none" style={{ position: "absolute", flexDirection: "row", gap: 3 }}>{[0,1,2].map(i => <View key={i} style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: "#234F34" }} />)}</View></Pressable>
    </Animated.View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.35)", justifyContent: "flex-end", padding: 12, paddingBottom: insets.bottom + 12 }}>
        <View style={{ height: "75%", maxHeight: 640, backgroundColor: "white", borderRadius: 20, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 14, backgroundColor: "#234F34" }}><View style={{ flex: 1 }}><Text variant="subheading" style={{ color: "white" }}>Care Bora assistant</Text><Text variant="caption" style={{ color: "#DCE7DE" }}>Services, orders & account help</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Start new conversation" hitSlop={10} onPress={reset} style={{ padding: 6 }}><RotateCcw size={19} color="white" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Close assistant" hitSlop={10} onPress={() => setOpen(false)} style={{ padding: 6 }}><X size={23} color="white" /></Pressable></View>
          <ScrollView ref={log} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: "#F8FAFC" }} contentContainerStyle={{ padding: 14, gap: 12 }} onContentSizeChange={() => log.current?.scrollToEnd({ animated: false })}>
            {turns.map((turn, i) => <View key={i} style={{ alignSelf: turn.role === "user" ? "flex-end" : "flex-start", maxWidth: "94%", backgroundColor: turn.role === "user" ? "#234F34" : "white", borderRadius: 16, padding: 12, borderWidth: turn.role === "assistant" ? 1 : 0, borderColor: "#E2E8F0" }}><Text accessibilityLabel={`${turn.role === "user" ? "You" : "Care Bora assistant"}: ${turn.content}`} style={{ color: turn.role === "user" ? "white" : "#334155", lineHeight: 22 }}>{turn.content}</Text></View>)}
            {busy && <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 8 }}><ActivityIndicator size="small" color="#234F34" /><Text variant="caption">Checking Care Bora…</Text></View>}
            {!busy && latest && <View style={{ gap: 8 }}>{navigationActions(latest).map(action => <Pressable key={action.id} accessibilityRole="button" accessibilityLabel={`${action.title}${action.detail ? `, ${action.detail}` : ""}`} onPress={() => { setOpen(false); router.push(action.mobile as never); }} style={{ backgroundColor: "#EDF5EF", borderColor: "#D5E8DC", borderWidth: 1, borderRadius: 12, padding: 12 }}><Text style={{ color: "#234F34", fontFamily: "Inter_600SemiBold" }}>{action.title} ↗</Text>{action.detail && <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>{action.detail}</Text>}</Pressable>)}<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>{latest.suggestions?.map(suggestion => <Button key={suggestion} title={suggestion} variant="secondary" size="sm" onPress={() => void ask(suggestion)} />)}</View></View>}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: "#E2E8F0" }}><TextInput ref={input} accessibilityLabel="Ask for navigation help" placeholder="Ask about Care Bora…" value={question} onChangeText={setQuestion} editable={!busy} maxLength={500} onSubmitEditing={() => void ask()} style={{ flex: 1, minWidth: 0, color: "#0F172A", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12 }} /><Pressable accessibilityRole="button" accessibilityLabel="Send question" disabled={busy || !question.trim()} onPress={() => void ask()} style={{ backgroundColor: "#234F34", opacity: busy || !question.trim() ? 0.4 : 1, width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" }}><Send size={19} color="white" /></Pressable></View>
          <Text variant="caption" tone="muted" style={{ fontSize: 10, paddingHorizontal: 14, paddingBottom: 10 }}>Service help. Never share passwords or verification codes.</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

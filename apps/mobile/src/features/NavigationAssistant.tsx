import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, usePathname } from "expo-router";
import { Bot, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAVIGATION_SERVICES, type NavigationReply } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";

export function NavigationAssistant() {
  const pathname = usePathname();
  const { user } = useAuth();
  return <Assistant key={`${user?.id ?? "guest"}:${pathname}`} />;
}
function Assistant() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<NavigationReply>({ message: "Hi! What would you like to do? Choose a service or ask me where to find it.", serviceIds: NAVIGATION_SERVICES.slice(0, 6).map(s => s.id), source: "guide" });
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
  async function ask() {
    if (busy || !question.trim()) return;
    setBusy(true);
    try { setReply(await api.navigateAssistant(question)); setQuestion(""); }
    catch { setReply({ message: "I couldn't connect. Choose a service below or contact support.", serviceIds: ["consultations", "pharmacy", "home", "ambulance", "labs", "support"], source: "guide" }); }
    finally { setBusy(false); }
  }
  if (hidden) return null;
  return <>
    <Animated.View style={{ position: "absolute", right: 12, bottom: insets.bottom + 76, transform: [{ translateX: shake }] }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open navigation assistant" onPress={() => setOpen(true)} style={{ backgroundColor: "#115E59", width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", elevation: 3 }}><Bot size={21} color="white" /></Pressable>
    </Animated.View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.35)", justifyContent: "flex-end", padding: 12, paddingBottom: insets.bottom + 12 }}>
        <View style={{ maxHeight: "65%", backgroundColor: "white", padding: 16, borderRadius: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text variant="subheading">Care Bora assistant</Text><Pressable accessibilityRole="button" accessibilityLabel="Close assistant" hitSlop={12} onPress={() => setOpen(false)}><X size={24} color="#115E59" /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
            <Text variant="caption" tone="muted">Navigation help. Please keep medical details private.</Text>
            <Text accessibilityLiveRegion="polite">{busy ? "Finding your next step…" : reply.message}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{NAVIGATION_SERVICES.filter(s => reply.serviceIds.includes(s.id)).map(s => <Button key={s.id} title={`${s.title} ↗`} variant="secondary" size="sm" onPress={() => { setOpen(false); router.push(s.mobile as never); }} />)}</View>
            <TextInput accessibilityLabel="Ask for navigation help" placeholder="How do I book a doctor?" value={question} onChangeText={setQuestion} maxLength={500} onSubmitEditing={ask} style={{ color: "#0F172A", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12 }} />
            <Button title="Send question" loading={busy} disabled={!question.trim()} onPress={ask} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

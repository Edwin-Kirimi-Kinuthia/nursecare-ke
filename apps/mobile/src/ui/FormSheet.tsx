import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { useTheme } from "./theme";

/** Bottom sheet for short forms (the website uses a centred modal; this is its phone equivalent). */
export function FormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: t.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ maxHeight: "88%", backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, paddingBottom: 8 }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18 }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><X size={20} color={t.textFaint} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingTop: 8, gap: 14 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

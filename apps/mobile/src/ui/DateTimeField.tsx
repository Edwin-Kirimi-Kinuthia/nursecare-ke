import { useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarClock, X } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "./theme";

const fmt = (d: Date) => d.toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Optional date + time. Native pickers on the phones; a typed "2026-10-20 14:30" in the browser preview. */
export function DateTimeField({ label, value, onChange, minimumDate }: { label: string; value: Date | null; onChange: (d: Date | null) => void; minimumDate?: Date }) {
  const t = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [text, setText] = useState("");

  if (Platform.OS === "web") {
    return (
      <View style={{ gap: 6 }}>
        <Text variant="label" tone="muted">{label}</Text>
        <TextInput value={text} placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={t.textFaint}
          onChangeText={(v) => { setText(v); const d = new Date(v.replace(" ", "T")); onChange(isNaN(+d) ? null : d); }}
          style={{ minHeight: 48, borderWidth: 1.5, borderColor: t.border, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, backgroundColor: "#fff" }} />
      </View>
    );
  }

  function openAndroid() {
    const start = value ?? new Date();
    DateTimePickerAndroid.open({
      value: start, mode: "date", minimumDate,
      onChange: (e, day) => {
        if (e.type !== "set" || !day) return;
        DateTimePickerAndroid.open({
          value: day, mode: "time", is24Hour: true,
          onChange: (e2, time) => {
            if (e2.type !== "set" || !time) return;
            const d = new Date(day); d.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(d);
          },
        });
      },
    });
  }

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">{label}</Text>
      <Pressable onPress={() => (Platform.OS === "android" ? openAndroid() : setIosOpen((o) => !o))} accessibilityRole="button" accessibilityLabel={label}
        style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: t.border, borderRadius: 14, backgroundColor: "#fff" }}>
        <CalendarClock size={18} color={t.textMuted} />
        <Text style={{ flex: 1, color: value ? t.text : t.textFaint }}>{value ? fmt(value) : "Any time"}</Text>
        {value ? <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel="Clear"><X size={16} color={t.textFaint} /></Pressable> : null}
      </Pressable>
      {Platform.OS === "ios" && iosOpen && (
        <DateTimePicker value={value ?? new Date()} mode="datetime" display="inline" minimumDate={minimumDate} onChange={(_, d) => d && onChange(d)} />
      )}
    </View>
  );
}

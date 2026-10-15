import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COUNTRIES, flagEmoji, type Country } from "@carebora/shared";
import { Text } from "./Text";
import { radius, useTheme } from "./theme";

const KENYA = COUNTRIES[0]!;

/**
 * Flag + dial code + number, the same control as the website. `value` and
 * `onChange` speak full international numbers ("+254712345678"), which every
 * endpoint accepts, so callers never split or join anything.
 *
 * `lockedToKenya` is for M-Pesa fields: an STK prompt only reaches Kenyan
 * Safaricom numbers, so the prefix is shown but can't be changed.
 */
export function PhoneField({ label, value, onChange, lockedToKenya, error, hint }: {
  label: string; value: string; onChange: (v: string) => void; lockedToKenya?: boolean; error?: string | null; hint?: string;
}) {
  const t = useTheme();
  const [iso2, setIso2] = useState(KENYA.iso2);
  const [picking, setPicking] = useState(false);
  const [focused, setFocused] = useState(false);
  const country = lockedToKenya ? KENYA : COUNTRIES.find((c) => c.iso2 === iso2) ?? KENYA;

  const local = value.startsWith(country.dialCode) ? value.slice(country.dialCode.length) : value.replace(/^\+/, "");

  const emit = (dial: string, raw: string) => {
    let digits = raw.replace(/\D/g, "");
    const bare = dial.replace("+", "");
    // A pasted full international number mustn't double the dial code.
    if (digits.startsWith(bare) && digits.length > bare.length) digits = digits.slice(bare.length);
    digits = digits.replace(/^0+/, "");
    onChange(digits ? `${dial}${digits}` : "");
  };

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" tone="muted">{label}</Text>
      <View style={{ flexDirection: "row", borderWidth: 1.5, borderRadius: radius.md, borderColor: error ? t.danger : focused ? t.primary : t.border, backgroundColor: t.surface }}>
        <Pressable
          disabled={lockedToKenya}
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${country.dialCode}, ${country.name}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: t.border, backgroundColor: t.surfaceAlt, borderTopLeftRadius: radius.md - 2, borderBottomLeftRadius: radius.md - 2 }}
        >
          <Text style={{ fontSize: 18 }}>{flagEmoji(country.iso2)}</Text>
          <Text variant="label">{country.dialCode}</Text>
          {!lockedToKenya && <Ionicons name="chevron-down" size={14} color={t.textFaint} />}
        </Pressable>
        <TextInput
          value={local}
          onChangeText={(v) => emit(country.dialCode, v)}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="712 345 678"
          placeholderTextColor={t.textFaint}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: t.text }}
        />
      </View>
      {error ? <Text variant="caption" tone="danger">{error}</Text> : hint ? <Text variant="caption" tone="faint">{hint}</Text> : null}
      <CountryPicker visible={picking} onClose={() => setPicking(false)} onPick={(c) => { setIso2(c.iso2); emit(c.dialCode, local); setPicking(false); }} />
    </View>
  );
}

function CountryPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (c: Country) => void }) {
  const t = useTheme();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.dialCode.includes(s)) : COUNTRIES;
  }, [q]);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="heading">Country code</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Ionicons name="close" size={26} color={t.text} />
          </Pressable>
        </View>
        <TextInput
          value={q} onChangeText={setQ} placeholder="Search country or code" placeholderTextColor={t.textFaint}
          autoCorrect={false} accessibilityLabel="Search country"
          style={{ minHeight: 46, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, color: t.text, backgroundColor: t.surface }}
        />
        <FlatList
          data={list}
          keyExtractor={(c) => c.iso2}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => onPick(item)} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 22 }}>{flagEmoji(item.iso2)}</Text>
              <Text style={{ flex: 1 }}>{item.name}</Text>
              <Text tone="muted">{item.dialCode}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

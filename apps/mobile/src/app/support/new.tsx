import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  SUPPORT_CATEGORY_LABELS, SUPPORT_DOCUMENT_LABELS, type SupportCategory, type SupportDocumentType,
} from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { useContacts } from "@/lib/appConfig";
import { callNumber } from "@/lib/links";
import { Screen } from "@/ui/Screen";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { Footer } from "@/ui/Footer";
import { Ambulance, MessageSquare } from "lucide-react-native";
import { PhoneField } from "@/ui/PhoneField";
import { radius, useTheme } from "@/ui/theme";

const CATEGORIES: SupportCategory[] = ["document_request", "appointment_help", "payment_issue", "general_enquiry", "technical_issue", "complaint"];

/** Message the team, or request a document (sick-off sheet, medical report…). Works signed out: someone who can't sign in is who most needs support. */
export default function NewSupportMessage() {
  const t = useTheme();
  const { user } = useAuth();
  const { ambulancePhone } = useContacts();
  const [category, setCategory] = useState<SupportCategory>("document_request");
  const [documentType, setDocumentType] = useState<SupportDocumentType>("sick_off");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState(user && user.fullName !== "Deleted user" ? user.fullName : "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const ticket = await api.createSupportTicket({
        category,
        documentType: category === "document_request" ? documentType : undefined,
        subject: subject.trim(),
        message: message.trim(),
        contactName: name.trim(),
        contactEmail: email.trim().toLowerCase(),
        contactPhone: phone || undefined,
      });
      setSentId(ticket.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sentId) {
    return (
      <Screen>
        <Banner tone="ok">Message sent. We&apos;ve emailed a confirmation to {email.trim()} and our team will reply there. Reference {sentId.slice(0, 8).toUpperCase()}.</Banner>
        {user && <Button title="View my messages" onPress={() => router.replace("/support")} />}
        <Button title="Done" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const ready = subject.trim().length >= 3 && message.trim().length >= 10 && name.trim().length >= 2 && email.includes("@");
  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Contact us" Icon={MessageSquare} title="Message us directly"
        lede="Ask us anything, or request a medical document — a sick-off sheet, medical report, fit-to-work or school form. A licensed clinician reviews every document request." />
      <View style={{ backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3", borderRadius: 24, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" }}>
            <Ambulance size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Inter_700Bold", color: "#881337", fontSize: 16, lineHeight: 22 }}>Medical emergency? Call {ambulancePhone}</Text>
            <Text style={{ color: "#BE123C", fontSize: 14 }}>Ambulance dispatch — don&apos;t wait for an email reply.</Text>
          </View>
        </View>
        <Button title={`Call ${ambulancePhone}`} variant="danger" size="sm" onPress={() => callNumber(ambulancePhone)} />
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", padding: 20, gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text variant="label" style={{ color: "#334155" }}>What can we help with?</Text>
        {CATEGORIES.map((c) => <Choice key={c} label={SUPPORT_CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(c)} />)}
      </View>

      {category === "document_request" && (
        <View style={{ gap: 8 }}>
          <Text variant="label" style={{ color: "#334155" }}>Which document?</Text>
          {(Object.keys(SUPPORT_DOCUMENT_LABELS) as SupportDocumentType[]).map((d) => (
            <Choice key={d} label={SUPPORT_DOCUMENT_LABELS[d]} selected={documentType === d} onPress={() => setDocumentType(d)} />
          ))}
          <Text variant="caption" tone="faint">A licensed clinician reviews every request, and some need a consultation first.</Text>
        </View>
      )}

      <Field label="Subject" value={subject} onChangeText={setSubject} maxLength={150} placeholder={category === "document_request" ? "Sick-off for 2 days" : "What's this about?"} />
      <View style={{ gap: 6 }}>
        <Text variant="label" tone="muted">Your message</Text>
        <TextInput
          value={message} onChangeText={setMessage} multiline maxLength={4000} accessibilityLabel="Your message"
          placeholder={category === "document_request" ? "What it's for, the dates it needs to cover, and any employer or school requirements." : "Give us as much detail as you can."}
          placeholderTextColor={t.textFaint}
          style={{ minHeight: 120, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.md, padding: 12, fontSize: 15, color: t.text, backgroundColor: t.surface, textAlignVertical: "top" }}
        />
      </View>
      <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" hint="We reply to this address." />
      <PhoneField label="Phone (optional)" value={phone} onChange={setPhone} />
      {error && <Banner tone="danger">{error}</Banner>}
      <Button title="Send message" onPress={send} loading={busy} disabled={!ready} />
      </View>
      <Footer />
    </Screen>
  );
}

/** A full-width option button: teal-50 with a teal border when selected, as on the website's contact form. */
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      style={{ borderWidth: 1.5, borderColor: selected ? "#14B8A6" : "#E2E8F0", backgroundColor: selected ? "#F0FDFA" : "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}>
      <Text style={{ color: selected ? "#0F766E" : "#334155", fontFamily: selected ? "Inter_600SemiBold" : "Inter_500Medium" }}>{label}</Text>
    </Pressable>
  );
}

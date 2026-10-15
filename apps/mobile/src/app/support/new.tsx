import { useState } from "react";
import { TextInput, View } from "react-native";
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
import { Banner, Chip } from "@/ui/parts";
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
    <Screen>
      <Banner tone="danger">In an emergency, call {ambulancePhone} instead of writing.</Banner>
      <Button title={`Call ${ambulancePhone}`} variant="danger" size="sm" onPress={() => callNumber(ambulancePhone)} />

      <View style={{ gap: 8 }}>
        <Text variant="label" tone="muted">What can we help with?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => <Chip key={c} label={SUPPORT_CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(c)} />)}
        </View>
      </View>

      {category === "document_request" && (
        <View style={{ gap: 8 }}>
          <Text variant="label" tone="muted">Which document?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(SUPPORT_DOCUMENT_LABELS) as SupportDocumentType[]).map((d) => (
              <Chip key={d} label={SUPPORT_DOCUMENT_LABELS[d]} selected={documentType === d} onPress={() => setDocumentType(d)} />
            ))}
          </View>
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
    </Screen>
  );
}

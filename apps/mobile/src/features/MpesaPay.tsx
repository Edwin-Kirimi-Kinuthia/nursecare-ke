import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { kes } from "@/lib/format";
import { useAppConfig } from "@/lib/appConfig";
import { openSite } from "@/lib/links";
import { Button } from "@/ui/Button";
import { PhoneField } from "@/ui/PhoneField";
import { Text } from "@/ui/Text";
import { Banner } from "@/ui/parts";
import { Card } from "@/ui/Screen";
import { radius, useTheme } from "@/ui/theme";

const TIMEOUT_MS = 90_000;
const POLL_MS = 2_500;

/**
 * Turn a gateway failure into something a patient can act on. Daraja's own
 * strings are written for developers ("Failed due to an unresolved reason
 * type."), which tells a patient nothing about what to do next.
 */
function explainFailure(reason: string | null): string {
  const r = (reason ?? "").toLowerCase();
  if (r.includes("cancel")) return "You cancelled the request on your phone.";
  if (r.includes("insufficient") || r.includes("balance")) return "There wasn't enough money in your M-Pesa account.";
  if (r.includes("wrong pin") || r.includes("invalid pin")) return "That M-Pesa PIN wasn't right.";
  if (r.includes("timeout") || r.includes("expire")) return "The request timed out before you confirmed it.";
  if (r.includes("lock subscriber")) return "Your line was busy with another M-Pesa request. Finish or cancel that one, then try again.";
  if (r.includes("limit")) return "This amount is over your M-Pesa transaction limit.";
  return "M-Pesa couldn't complete the payment.";
}

type Phase = "idle" | "starting" | "waiting" | "paid" | "failed" | "timeout";

/** Pay for an appointment by M-Pesa: asks for the number, sends the prompt, then waits for the real result. */
export function MpesaPay({ appointmentId, amountKes, defaultPhone, onPaid }: {
  appointmentId: string; amountKes: number; defaultPhone?: string | null; onPaid: () => void;
}) {
  const t = useTheme();
  const config = useAppConfig();
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);

  // Poll until the payment settles, so the outcome shows here instead of the
  // patient being told to check their phone and left guessing.
  useEffect(() => {
    if (phase !== "waiting" || !paymentId) return;
    let live = true;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!live) return;
      if (Date.now() - startedAt > TIMEOUT_MS) { setPhase("timeout"); return; }
      try {
        const p = await api.getPayment(paymentId);
        if (!live) return;
        if (p.status === "completed") { setReceipt(p.receiptNumber); setPhase("paid"); onPaidRef.current(); return; }
        if (p.status === "failed" || p.status === "cancelled") { setFailure(p.failureReason); setPhase("failed"); return; }
      } catch { /* a dropped poll is not a failure — keep waiting */ }
      timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => { live = false; clearTimeout(timer); };
  }, [phase, paymentId]);

  async function start() {
    setPhase("starting");
    setError(null);
    try {
      const p = await api.initiateMpesaPayment({ appointmentId, phoneNumber: phone });
      setPaymentId(p.id);
      setPhase("waiting");
    } catch (err) {
      setError(errorMessage(err));
      setPhase("idle");
    }
  }

  async function recheck() {
    if (!paymentId) return;
    try {
      const p = await api.getPayment(paymentId);
      if (p.status === "completed") { setReceipt(p.receiptNumber); setPhase("paid"); onPaidRef.current(); }
      else if (p.status === "failed" || p.status === "cancelled") { setFailure(p.failureReason); setPhase("failed"); }
      else setPhase("waiting");
    } catch (err) { setError(errorMessage(err)); }
  }

  // The manual till mode has no in-app flow; send people to the website for it.
  if (config?.payments.mode === "till") {
    return (
      <Card>
        <Text variant="subheading">Pay {kes(amountKes)}</Text>
        <Banner tone="info">Payment for this consultation is completed on our website.</Banner>
        <Button title="Open Care Bora website" variant="secondary" onPress={() => openSite("/appointments")} />
      </Card>
    );
  }

  if (phase === "paid") {
    return (
      <Card style={{ alignItems: "center", gap: 6 }}>
        <Ionicons name="checkmark-circle" size={44} color={t.okText} />
        <Text variant="heading">Payment received</Text>
        <Text tone="muted">{kes(amountKes)} paid successfully.</Text>
        {receipt ? <Text variant="caption" tone="muted">M-Pesa receipt {receipt}</Text> : null}
      </Card>
    );
  }

  if (phase === "waiting" || phase === "timeout") {
    const timedOut = phase === "timeout";
    return (
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
            {timedOut ? <Ionicons name="time-outline" size={24} color={t.onPrimary} /> : <ActivityIndicator color={t.onPrimary} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="subheading">{timedOut ? "Still waiting for M-Pesa" : "Approve the payment on your phone"}</Text>
            <Text tone="muted">
              {timedOut ? "We haven't heard back yet. If you already entered your PIN, check again." : `A request for ${kes(amountKes)} has been sent to ${phone}.`}
            </Text>
          </View>
        </View>
        {!timedOut && (
          <View style={{ gap: 4 }}>
            <Text variant="caption" tone="muted">1. An M-Pesa prompt is waiting on your phone</Text>
            <Text variant="caption" tone="muted">2. Check the amount, then enter your M-Pesa PIN</Text>
            <Text variant="caption" tone="muted">3. Stay here — this updates by itself</Text>
          </View>
        )}
        {error && <Text variant="caption" tone="danger">{error}</Text>}
        {timedOut && <Button title="Check payment status" onPress={recheck} />}
        <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>Care Bora never sees or stores your M-Pesa PIN.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="subheading">Pay {kes(amountKes)} with M-Pesa</Text>
      <Text tone="muted">Your doctor can start the consultation once this is paid.</Text>
      {phase === "failed" && <Banner tone="danger">{explainFailure(failure)} Nothing has been charged. You can try again.</Banner>}
      {error && <Banner tone="danger">{error}</Banner>}
      <PhoneField label="M-Pesa number" value={phone} onChange={setPhone} lockedToKenya hint="We'll send a payment prompt to this Safaricom number." />
      <Button title={`Pay ${kes(amountKes)}`} onPress={start} loading={phase === "starting"} disabled={phone.length < 12} />
    </Card>
  );
}

import { useRef, useState } from "react";
import { router } from "expo-router";
import { PROVIDER_ROLES } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { dayTime, kes } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Field } from "@/ui/Field";
import { Button } from "@/ui/Button";
import { Banner, Loading } from "@/ui/parts";
// An idempotency identifier, not an authentication token; retained across retries.
const newKey = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const n = Math.floor(Math.random() * 16); return (c === "x" ? n : (n & 3) | 8).toString(16); });
export default function EarningsScreen() {
  const { user } = useAuth();
  if (!user) return <Screen><Text>Sign in to view earnings.</Text><Button title="Sign in" onPress={() => router.push("/login")} /></Screen>;
  if (user.role !== "vendor" && !PROVIDER_ROLES.includes(user.role)) return <Screen><Text>Earnings are available to providers and business owners.</Text></Screen>;
  return <Account key={user.id} />;
}
function Account() {
  const summary = useAsync(() => api.getEarnings(), []);
  const [amount, setAmount] = useState(""); const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const key = useRef<string | null>(null);
  async function withdraw() {
    if (busy) return; setBusy(true); setNotice("");
    try {
      key.current ??= newKey();
      await api.requestWithdrawal({ amountKes: Number(amount), phoneNumber: phone, requestKey: key.current });
      key.current = null; setAmount(""); setNotice("Withdrawal requested. Track its M-Pesa transfer status below."); await summary.reload();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not request withdrawal"); }
    finally { setBusy(false); }
  }
  const data = summary.data;
  return <Screen onRefresh={summary.reload} refreshing={summary.refreshing}>
    <Text variant="heading">Earnings & withdrawals</Text><Text tone="muted">Your earnings after fees and refunds. Business accounts are accessible to the owner.</Text>
    {summary.loading && <Loading />}{summary.error && <><Banner tone="danger">{summary.error}</Banner><Button title="Try again" onPress={summary.reload} /></>}
    {data && <>
      <Card><Text tone="muted">Available to withdraw</Text><Text variant="heading">{kes(data.availableKes)}</Text><Text>Net earnings: {kes(data.earnedKes)}</Text><Text>Pending: {kes(data.pendingKes)} · Paid: {kes(data.paidKes)}</Text></Card>
      <Card><Text variant="subheading">Withdraw to M-Pesa</Text><Text tone="muted">{data.withdrawalMode === "mpesa_b2c" ? "Your request is sent to M-Pesa. Confirm the recipient number. Minimum withdrawal: KES 10." : "Our team reviews and sends your transfer. Confirm the recipient number before requesting."}</Text>
        <Field label="Amount (KES)" keyboardType="number-pad" editable={!busy} value={amount} onChangeText={v => { setAmount(v); key.current = null; }} />
        <Field label="M-Pesa number" placeholder="0712345678" keyboardType="phone-pad" editable={!busy} value={phone} onChangeText={v => { setPhone(v); key.current = null; }} />
        <Button title="Request withdrawal" loading={busy} disabled={!phone || !Number.isInteger(Number(amount)) || Number(amount) < data.minimumWithdrawalKes || Number(amount) > Math.min(data.availableKes, 250000)} onPress={withdraw} />
      </Card>
      {notice && <Banner>{notice}</Banner>}
      <Text variant="subheading">Withdrawal history</Text>{data.withdrawals.length === 0 && <Text tone="muted">No withdrawals yet.</Text>}
      {data.withdrawals.map(w => <Card key={w.id}><Text variant="subheading">{kes(w.amountKes)} · {w.status}</Text><Text>{w.phoneNumber}</Text>{w.failureReason && <Text tone="muted">{w.failureReason}</Text>}<Text variant="caption" tone="muted">{dayTime(w.createdAt)}{w.reference ? ` · ${w.reference}` : ""}</Text></Card>)}
    </>}
  </Screen>;
}

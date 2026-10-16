import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { AlertCircle, FileCheck2, Stethoscope, Trash2, Upload, ShoppingCart } from "lucide-react-native";
import type { Listing, Order } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { errorMessage } from "@/lib/useAsync";
import { useAppConfig } from "@/lib/appConfig";
import { openSite } from "@/lib/links";
import { pickImageDataUrl } from "@/lib/pickImage";
import { kes } from "@/lib/format";
import { MpesaPay } from "@/features/MpesaPay";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { PhoneField } from "@/ui/PhoneField";
import { Text } from "@/ui/Text";
import { Banner, Empty } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { Stepper } from "@/ui/Stepper";
import { useTheme } from "@/ui/theme";

type Row = Listing & { organization: { id: string; name: string } };

export default function CartScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const config = useAppConfig();
  const { items, add, sub, remove, clear } = useCart();
  const [catalog, setCatalog] = useState<Record<string, Row>>({});
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [rx, setRx] = useState<{ dataUrl: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ order: Order; total: number } | null>(null);

  // Fetch details for any cart line we haven't seen yet; drop lines that no longer exist.
  useEffect(() => {
    const missing = Object.keys(items).filter((id) => !catalog[id]);
    if (missing.length === 0) return;
    let live = true;
    (async () => {
      const got = await Promise.all(missing.map((id) => api.getListing(id).then((l) => [id, l] as const).catch(() => [id, null] as const)));
      if (!live) return;
      setCatalog((c) => { const n = { ...c }; got.forEach(([id, l]) => { if (l) n[id] = l as Row; }); return n; });
      got.forEach(([id, l]) => { if (!l) remove(id); });
    })();
    return () => { live = false; };
  }, [items, catalog, remove]);

  const lines = Object.entries(items).filter(([id]) => catalog[id]);
  const total = lines.reduce((s, [id, q]) => s + catalog[id]!.priceKes * q, 0);
  const needsRx = lines.some(([id]) => catalog[id]!.drug.requiresPrescription);

  async function attach() {
    setError(null);
    try { const r = await pickImageDataUrl(); if (r) setRx(r); } catch (err) { setError(errorMessage(err)); }
  }

  async function checkout() {
    if (!user) { router.push("/login"); return; }
    setBusy(true); setError(null);
    try {
      const order = await api.createOrder({
        items: lines.map(([listingId, qty]) => ({ listingId, qty })),
        phoneNumber: phone, deliveryAddress: address, prescriptionImage: rx?.dataUrl,
      });
      clear(); setRx(null);
      setPlaced({ order, total });
    } catch (err) { setError(errorMessage(err, "Checkout failed.")); }
    finally { setBusy(false); }
  }

  if (placed) {
    const p = placed.order.payment;
    return (
      <Screen>
        <PageHeader eyebrow="Pharmacy" Icon={ShoppingCart} title="Payment" />
        {p && config?.payments.mode !== "till" ? (
          <MpesaPay existingPaymentId={p.id} amountKes={placed.total} phoneHint={phone} noun="order" sitePath="/pharmacy" onPaid={() => {}} />
        ) : (
          <Banner tone="info">Your order is placed. Finish the payment on our website.</Banner>
        )}
        <Button title="View my order" variant="secondary" onPress={() => router.replace({ pathname: "/orders/[id]", params: { id: placed.order.id } })} />
        {config?.payments.mode === "till" && <Button title="Open Care Bora website" variant="ghost" onPress={() => openSite("/pharmacy")} />}
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Pharmacy" Icon={ShoppingCart} title="Your cart" />
      {lines.length === 0 ? (
        <Empty icon="cart-outline" title="Your cart is empty" hint="Add products to get started." action={{ label: "Browse pharmacy", onPress: () => router.replace("/pharmacy") }} />
      ) : (
        <>
          {lines.map(([id, q]) => {
            const l = catalog[id]!;
            return (
              <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#F8FAFC", overflow: "hidden" }}>
                  {l.drug.imageUrl ? <Image source={{ uri: l.drug.imageUrl }} style={{ width: "100%", height: "100%" }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={2}>{l.drug.name}</Text>
                  <Text variant="caption" tone="muted">{kes(l.priceKes)} each · {l.organization.name}</Text>
                  <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Stepper qty={q} onAdd={() => add(id)} onSub={() => sub(id)} />
                    <Pressable onPress={() => remove(id)} accessibilityRole="button" accessibilityLabel={`Remove ${l.drug.name}`} hitSlop={8}><Trash2 size={18} color="#CBD5E1" /></Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
            <Text tone="muted" style={{ fontSize: 16 }}>Total</Text>
            <Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 24 }}>{kes(total)}</Text>
          </View>

          {needsRx && (
            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 16, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><AlertCircle size={16} color="#92400E" /><Text style={{ color: "#92400E", fontFamily: "Inter_700Bold" }}>Prescription required</Text></View>
              <Text style={{ color: "#B45309", fontSize: 13 }}>Your cart has prescription-only medication. Upload a prescription or book a consultation to continue.</Text>
              {rx ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, padding: 10 }}>
                  <FileCheck2 size={18} color="#047857" /><Text style={{ flex: 1, color: "#047857" }} numberOfLines={1}>{rx.name}</Text>
                  <Text onPress={() => setRx(null)} style={{ color: t.textFaint, fontSize: 13 }}>Remove</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}><Button variant="secondary" size="sm" title="Upload" icon={<Upload size={16} color={t.text} />} onPress={attach} /></View>
                  <View style={{ flex: 1 }}><Button size="sm" title="Consult" icon={<Stethoscope size={16} color="#fff" />} onPress={() => router.push("/doctors")} /></View>
                </View>
              )}
            </View>
          )}

          <View style={{ backgroundColor: "#fff", borderRadius: 24, borderWidth: 1, borderColor: t.border, padding: 18, gap: 14 }}>
            <PhoneField label="M-Pesa phone" value={phone} onChange={setPhone} lockedToKenya />
            <Field label="Delivery address" value={address} onChangeText={setAddress} multiline placeholder="Building, street, area" style={{ minHeight: 70, textAlignVertical: "top", paddingTop: 12 }} />
            {error && <Banner tone="danger">{error}</Banner>}
            <Button title={needsRx && !rx ? "Add prescription to continue" : user ? `Pay ${kes(total)} via M-Pesa` : "Sign in to check out"}
              onPress={checkout} loading={busy} disabled={user ? address.trim().length < 5 || phone.length < 12 || (needsRx && !rx) : false} />
            <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>Secure M-Pesa checkout</Text>
          </View>
        </>
      )}
    </Screen>
  );
}

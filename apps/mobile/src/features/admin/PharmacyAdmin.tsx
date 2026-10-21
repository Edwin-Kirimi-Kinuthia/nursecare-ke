import { absoluteUrl } from "@/lib/links";
import { useState } from "react";
import { Alert, Image, Pressable, Switch, View } from "react-native";
import { Pencil, Trash2, X, ImagePlus } from "lucide-react-native";
import type { AdminCreateDrugInput } from "@carebora/shared";
import type { AdminDrug } from "@carebora/api-client";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAct } from "@/lib/useAct";
import { pickImageDataUrl } from "@/lib/pickImage";
import { kes } from "@/lib/format";
import { Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FormSheet } from "@/ui/FormSheet";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";

export function PharmacyAdmin() {
  const list = useAsync(() => api.adminListDrugs({ limit: 50 } as never).then((r) => r.drugs), []);
  const [editing, setEditing] = useState<AdminDrug | "new" | null>(null);
  const { err, run } = useAct();
  const drugs = list.data ?? [];
  const confirmRemove = (d: AdminDrug) => Alert.alert(`Remove "${d.name}"?`, "This hides it from every vendor.", [
    { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => run(d.id, () => api.adminDeleteDrug(d.id), list.reload) },
  ]);
  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text tone="muted">{drugs.length} in the catalogue · {drugs.filter((d) => d.sellerCount > 0).length} on sale</Text>
        <Button title="Add drug" size="sm" onPress={() => setEditing("new")} />
      </View>
      {(err || list.error) && <Banner tone="danger">{err ?? list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : drugs.length === 0 ? <Empty icon="medkit-outline" title="No drugs yet" /> : drugs.map((d) => (
        <Card key={d.id} style={{ borderRadius: 16, opacity: d.isActive ? 1 : 0.55 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" }}>
              {d.imageUrl ? <Image source={{ uri: absoluteUrl(d.imageUrl) }} style={{ width: "100%", height: "100%" }} /> : null}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{d.name}</Text>
              <Text variant="caption" tone="muted">{d.category}</Text>
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Badge label={d.requiresPrescription ? "Rx" : "OTC"} tone={d.requiresPrescription ? "info" : "neutral"} />
                {d.sellerCount > 0 ? <Text variant="caption">{d.priceKes === null ? "—" : kes(d.priceKes)} · {d.stockQty ?? "—"} in stock</Text> : <Badge label="Not on sale" tone="warn" />}
              </View>
            </View>
            <Pressable onPress={() => setEditing(d)} hitSlop={8} accessibilityLabel={`Edit ${d.name}`}><Pencil size={18} color="#64748B" /></Pressable>
            <Pressable onPress={() => confirmRemove(d)} hitSlop={8} accessibilityLabel={`Remove ${d.name}`}><Trash2 size={18} color="#F43F5E" /></Pressable>
          </View>
        </Card>
      ))}
      {editing && <DrugSheet drug={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void list.reload(); }} />}
    </>
  );
}

function DrugSheet({ drug, onClose, onSaved }: { drug: AdminDrug | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(drug?.name ?? ""); const [generic, setGeneric] = useState(drug?.genericName ?? ""); const [category, setCategory] = useState(drug?.category ?? "");
  const [form, setForm] = useState(drug?.form ?? ""); const [strength, setStrength] = useState(drug?.strength ?? ""); const [description, setDescription] = useState(drug?.description ?? "");
  const [rx, setRx] = useState(drug?.requiresPrescription ?? false);
  const [images, setImages] = useState<string[]>(drug?.images?.length ? drug.images : drug?.imageUrl ? [drug.imageUrl] : []);
  const [price, setPrice] = useState(drug?.priceKes ? String(drug.priceKes) : ""); const [stock, setStock] = useState(String(drug?.stockQty ?? 0));
  const [pickErr, setPickErr] = useState<string | null>(null);
  const { busy, err, run } = useAct();
  async function addImage() {
    setPickErr(null);
    try { const r = await pickImageDataUrl({ width: 1000 }); if (r) setImages((i) => [...i, r.dataUrl].slice(0, 6)); } catch (e) { setPickErr(e instanceof Error ? e.message : "Couldn't read that image."); }
  }
  const input: AdminCreateDrugInput = {
    name, genericName: generic || undefined, description: description || undefined, category, form: form || undefined, strength: strength || undefined,
    requiresPrescription: rx, images, priceKes: parseInt(price, 10) || 0, stockQty: parseInt(stock, 10) || 0,
  };
  return (
    <FormSheet title={drug ? "Edit drug" : "Add drug"} onClose={onClose}>
      <Text variant="caption" tone="faint">Added to the shared catalogue and listed for sale through Care Bora Pharmacy. Vendor pharmacies set their own price and stock from their dashboard.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {images.map((src, i) => (
          <View key={i} style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0" }}>
            <Image source={{ uri: src }} style={{ width: "100%", height: "100%" }} />
            <Pressable onPress={() => setImages(images.filter((_, idx) => idx !== i))} accessibilityLabel="Remove image" style={{ position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 9, padding: 2 }}><X size={12} color="#fff" /></Pressable>
          </View>
        ))}
        {images.length < 6 && <Pressable onPress={addImage} accessibilityRole="button" accessibilityLabel="Add image" style={{ width: 64, height: 64, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }}><ImagePlus size={20} color="#94A3B8" /></Pressable>}
      </View>
      {pickErr && <Banner tone="danger">{pickErr}</Banner>}
      <Field label="Drug name" value={name} onChangeText={setName} />
      <Field label="Generic name (optional)" value={generic} onChangeText={setGeneric} />
      <Field label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Pain Relief" />
      <Field label="Form (optional)" value={form} onChangeText={setForm} placeholder="e.g. tablet" />
      <Field label="Strength (optional)" value={strength} onChangeText={setStrength} placeholder="e.g. 500mg" />
      <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline style={{ minHeight: 64, textAlignVertical: "top", paddingTop: 12 }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text>Requires a prescription</Text><Switch value={rx} onValueChange={setRx} /></View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Price (KES)" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ""))} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Stock" value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, ""))} keyboardType="number-pad" /></View>
      </View>
      {(parseInt(stock, 10) || 0) === 0 && <Text variant="caption" style={{ color: "#B45309" }}>Clients won&apos;t see this while stock is zero. Set a quantity to put it on sale.</Text>}
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title={drug ? "Save changes" : "Add drug"} loading={busy === "s"} disabled={!name.trim() || !category.trim()} onPress={() => run("s", () => (drug ? api.adminUpdateDrug(drug.id, input) : api.adminCreateDrug(input)), onSaved)} />
    </FormSheet>
  );
}

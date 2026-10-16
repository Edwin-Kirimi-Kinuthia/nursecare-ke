import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Building2, MapPin, Pencil, Phone, Plus } from "lucide-react-native";
import {
  KENYA_COUNTIES, type CreateAmbulanceInput, type CreateBranchInput, type EnterLabResultInput, type PatchAmbulanceRequestInput, type PatchLabOrderInput,
} from "@carebora/shared";
import type { Drug, Listing, LabOrder, LabOrderItem, LabTest, OrgBranch, OrganizationDetail, VendorOrder } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage, useAsync } from "@/lib/useAsync";
import { useAct } from "@/lib/useAct";
import { dayTime, kes } from "@/lib/format";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FormSheet } from "@/ui/FormSheet";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import { TabBar } from "@/ui/TabBar";
import { Text } from "@/ui/Text";
import { Badge, Banner, Empty, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";

type Tab = "overview" | "branches" | "team" | "catalogue" | "orders" | "dispatch" | "fleet" | "labtests" | "laborders";
const ORG_TONE = { pending: "warn", in_review: "info", approved: "ok", suspended: "danger", rejected: "danger" } as const;

export default function VendorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const org = useAsync(() => (user?.role === "vendor" ? api.getVendorOrg() : Promise.resolve(null)), [user?.id]);

  useEffect(() => { if (user && user.role !== "vendor") router.replace("/"); }, [user]);
  if (!user || user.role !== "vendor") return <Loading />;

  const o = org.data;
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" }, { id: "branches", label: "Branches" }, { id: "team", label: "Team" },
    ...(o?.type === "pharmacy" ? [{ id: "catalogue" as Tab, label: "Catalogue" }, { id: "orders" as Tab, label: "Orders" }] : []),
    ...(o?.type === "ambulance" ? [{ id: "dispatch" as Tab, label: "Dispatch" }, { id: "fleet" as Tab, label: "Fleet" }] : []),
    ...(o?.type === "lab" ? [{ id: "labtests" as Tab, label: "Tests" }, { id: "laborders" as Tab, label: "Lab orders" }] : []),
  ];
  return (
    <Screen onRefresh={org.reload} refreshing={org.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Vendor dashboard" Icon={Building2} title={o?.name ?? "Your business"} />
      {o && <View style={{ flexDirection: "row", gap: 6 }}><Badge label={o.status.replace("_", " ")} tone={ORG_TONE[o.status as keyof typeof ORG_TONE] ?? "neutral"} /><Badge label={o.type} /></View>}
      {o?.status === "pending" && <Banner tone="warn">Your business is awaiting admin review. You can still set up branches and team while you wait.</Banner>}
      <TabBar value={tab} tabs={tabs} onChange={setTab} />
      {org.error && <Banner tone="danger">{org.error}</Banner>}
      {org.loading && !o ? <Loading /> : o ? (
        <>
          {tab === "overview" && <Overview org={o} onSaved={org.reload} />}
          {tab === "branches" && <Branches branches={o.branches} onChanged={org.reload} />}
          {tab === "team" && <Team members={o.members} onChanged={org.reload} />}
          {tab === "catalogue" && <Catalogue />}
          {tab === "orders" && <Orders />}
          {tab === "dispatch" && <Dispatch />}
          {tab === "fleet" && <Fleet />}
          {tab === "labtests" && <LabTests />}
          {tab === "laborders" && <LabOrders />}
        </>
      ) : null}
    </Screen>
  );
}

const Meta = ({ children }: { children: React.ReactNode }) => <Text variant="caption" tone="faint">{children}</Text>;
const AddBar = ({ count, noun, onAdd, label }: { count: number; noun: string; onAdd: () => void; label: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
    <Text tone="muted">{count} {noun}</Text>
    <Button title={label} size="sm" icon={<Plus size={16} color="#fff" />} onPress={onAdd} />
  </View>
);

function Overview({ org, onSaved }: { org: OrganizationDetail; onSaved: () => void }) {
  const [description, setDescription] = useState(org.description ?? "");
  const [contactPhone, setContactPhone] = useState(org.contactPhone ?? "");
  const { busy, err, run } = useAct();
  return (
    <>
      <Card style={{ borderRadius: 20, padding: 16, gap: 12 }}>
        <Text variant="subheading">Business details</Text>
        <Field label="Description" value={description} onChangeText={setDescription} multiline style={{ minHeight: 80, textAlignVertical: "top", paddingTop: 12 }} />
        <PhoneField label="Contact phone" value={contactPhone} onChange={setContactPhone} />
        {err && <Banner tone="danger">{err}</Banner>}
        <Button title="Save changes" loading={busy === "save"} onPress={() => run("save", () => api.patchVendorOrg({ description: description || undefined, contactPhone: contactPhone || undefined }), onSaved)} />
      </Card>
      <Card style={{ borderRadius: 20, padding: 16 }}>
        <Text variant="subheading">Licence & payouts</Text>
        {[["Licence number", org.licenceNumber ?? "—"], ["Licence body", org.licenceBody ?? "—"], ["Commission rate", org.commissionPercent != null ? `${org.commissionPercent}%` : "Platform default"], ["Payout method", org.payoutMethod ?? "Not set up yet"]].map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text tone="muted">{k}</Text><Text style={{ fontFamily: "Inter_600SemiBold" }}>{v}</Text></View>
        ))}
        {org.reviewNotes ? <Text variant="caption" tone="muted">Admin note: {org.reviewNotes}</Text> : null}
      </Card>
    </>
  );
}

function Branches({ branches, onChanged }: { branches: OrgBranch[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const { busy, err, run } = useAct();
  return (
    <>
      <AddBar count={branches.length} noun="branch(es)" label="Add branch" onAdd={() => setAdding(true)} />
      {err && <Banner tone="danger">{err}</Banner>}
      {branches.map((b) => (
        <Card key={b.id} style={{ borderRadius: 16, opacity: b.isActive ? 1 : 0.55 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{b.name}</Text>
              <Text tone="muted">{b.town ? `${b.town}, ` : ""}{b.county}</Text>
              <Meta>Radius {b.deliveryRadiusKm}km · Fee KES {b.deliveryFeeKes} · Min order KES {b.minOrderKes}</Meta>
            </View>
            <Button title={b.isActive ? "Disable" : "Enable"} size="sm" variant={b.isActive ? "secondary" : "primary"} loading={busy === b.id} onPress={() => run(b.id, () => api.patchVendorBranch(b.id, { isActive: !b.isActive }), onChanged)} />
          </View>
        </Card>
      ))}
      {adding && <BranchSheet onClose={() => setAdding(false)} onSaved={() => { setAdding(false); onChanged(); }} />}
    </>
  );
}

function BranchSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(""); const [county, setCounty] = useState("Nairobi"); const [lat, setLat] = useState("-1.286389"); const [lng, setLng] = useState("36.817223");
  const { busy, err, run } = useAct();
  const counties = useMemo(() => KENYA_COUNTIES.map((c) => ({ value: c as string, label: c })), []);
  return (
    <FormSheet title="Add branch" onClose={onClose}>
      <Field label="Branch name" value={name} onChangeText={setName} />
      <Select label="County" value={county} options={counties} onChange={setCounty} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Latitude" value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" /></View>
        <View style={{ flex: 1 }}><Field label="Longitude" value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" /></View>
      </View>
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Add branch" loading={busy === "add"} disabled={!name.trim()} onPress={() => run("add", () => api.createVendorBranch({
        name, county: county as CreateBranchInput["county"], latitude: Number(lat), longitude: Number(lng), deliveryRadiusKm: 10, deliveryFeeKes: 0, minOrderKes: 0, isOpen24h: false,
      }), onSaved)} />
    </FormSheet>
  );
}

function Team({ members, onChanged }: { members: { id: string; role: string; user: { fullName: string; email: string } }[]; onChanged: () => void }) {
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"staff" | "manager">("staff");
  const { busy, err, run } = useAct();
  return (
    <>
      <Card style={{ borderRadius: 20, padding: 16 }}>
        <Text variant="subheading">Team</Text>
        {members.map((m) => (
          <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#F1F5F9", borderRadius: 12, padding: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_600SemiBold" }}>{m.user.fullName}</Text><Meta>{m.user.email} · {m.role}</Meta></View>
            {m.role !== "owner" && <Button title="Remove" variant="ghost" size="sm" loading={busy === m.id} onPress={() => Alert.alert("Remove this team member?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => run(m.id, () => api.removeVendorMember(m.id), onChanged) }])} />}
          </View>
        ))}
      </Card>
      <Card style={{ borderRadius: 20, padding: 16, gap: 12 }}>
        <Text variant="subheading">Invite a teammate</Text>
        <Meta>They must already have a CareBora account.</Meta>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Select label="Role" value={role} options={[{ value: "staff", label: "Staff" }, { value: "manager", label: "Manager" }]} onChange={setRole} />
        {err && <Banner tone="danger">{err}</Banner>}
        <Button title="Invite" loading={busy === "invite"} disabled={!email.includes("@")} onPress={() => run("invite", () => api.inviteVendorMember({ email, role }), () => { setEmail(""); onChanged(); })} />
      </Card>
    </>
  );
}

function Catalogue() {
  const list = useAsync(() => api.listVendorListings().then((r) => r.listings), []);
  const [sheet, setSheet] = useState<null | "new" | Listing>(null);
  const { busy, err, run } = useAct();
  const items = list.data ?? [];
  return (
    <>
      <AddBar count={items.length} noun="listing(s)" label="Add listing" onAdd={() => setSheet("new")} />
      {(err || list.error) && <Banner tone="danger">{err ?? list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty icon="medkit-outline" title="No listings yet" hint="Add your first drug." /> : items.map((l) => (
        <Card key={l.id} style={{ borderRadius: 16, opacity: l.isActive ? 1 : 0.55 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{l.drug.name}</Text>
              <Text>{kes(l.priceKes)} · <Text style={{ color: l.stockQty === 0 ? "#E11D48" : l.stockQty < 20 ? "#D97706" : "#334155", fontFamily: "Inter_600SemiBold" }}>{l.stockQty} in stock</Text></Text>
            </View>
            <Pressable onPress={() => setSheet(l)} hitSlop={8} accessibilityLabel={`Edit ${l.drug.name}`}><Pencil size={18} color="#64748B" /></Pressable>
            <Button title={l.isActive ? "Deactivate" : "Activate"} size="sm" variant={l.isActive ? "secondary" : "primary"} loading={busy === l.id} onPress={() => run(l.id, () => api.patchVendorListing(l.id, { isActive: !l.isActive }), list.reload)} />
          </View>
        </Card>
      ))}
      {sheet && <ListingSheet listing={sheet === "new" ? undefined : sheet} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); void list.reload(); }} />}
    </>
  );
}

function ListingSheet({ listing, onClose, onSaved }: { listing?: Listing; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState(""); const [results, setResults] = useState<Drug[]>([]);
  const [drug, setDrug] = useState<Drug | null>(listing?.drug ?? null);
  const [newName, setNewName] = useState(""); const [newCat, setNewCat] = useState("");
  const [price, setPrice] = useState(listing ? String(listing.priceKes) : ""); const [stock, setStock] = useState(listing ? String(listing.stockQty) : "0");
  const { busy, err, run } = useAct();
  useEffect(() => {
    if (listing) return;
    const h = setTimeout(() => {
      if (!q.trim()) { setResults([]); return; }
      api.browseCatalogue({ search: q, limit: 8 } as never).then((r) => setResults(r.drugs)).catch(() => {});
    }, 300);
    return () => clearTimeout(h);
  }, [q, listing]);
  const p = parseInt(price, 10) || 0; const s = parseInt(stock, 10) || 0;
  const ok = (listing || drug || (newName.trim() && newCat.trim())) && p > 0;
  return (
    <FormSheet title={listing ? "Edit listing" : "Add listing"} onClose={onClose}>
      {!listing && !drug && (
        <>
          <Field label="Find a drug in the shared catalogue" value={q} onChangeText={setQ} placeholder="Search…" />
          {results.map((d) => <Pressable key={d.id} onPress={() => setDrug(d)} style={{ paddingVertical: 8 }}><Text>{d.name} <Text variant="caption" tone="faint">· {d.category}</Text></Text></Pressable>)}
          {q.trim() && results.length === 0 && (
            <View style={{ gap: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "#CBD5E1", borderRadius: 12, padding: 12 }}>
              <Meta>Not found — add it to the shared catalogue:</Meta>
              <Field label="Drug name" value={newName} onChangeText={setNewName} />
              <Field label="Category" value={newCat} onChangeText={setNewCat} />
            </View>
          )}
        </>
      )}
      {(listing || drug) && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>{listing?.drug.name ?? drug?.name}</Text>
          {!listing && <Text onPress={() => setDrug(null)} style={{ color: "#94A3B8" }}>Change</Text>}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Price (KES)" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ""))} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Stock" value={stock} onChangeText={(v) => setStock(v.replace(/\D/g, ""))} keyboardType="number-pad" /></View>
      </View>
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Save" loading={busy === "save"} disabled={!ok} onPress={() => run("save", () => listing ? api.patchVendorListing(listing.id, { priceKes: p, stockQty: s })
        : api.createVendorListing(drug ? { drugId: drug.id, priceKes: p, stockQty: s } : { drug: { name: newName, category: newCat, requiresPrescription: false }, priceKes: p, stockQty: s }), onSaved)} />
    </FormSheet>
  );
}

const NEXT_ORDER = { paid: "processing", processing: "dispatched", dispatched: "delivered" } as const;
function Orders() {
  const list = useAsync(() => api.listVendorOrders({ limit: 50 } as never).then((r) => r.vendorOrders), []);
  const { busy, err, run } = useAct();
  const orders = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  if (orders.length === 0) return <Empty icon="cube-outline" title="No orders yet" />;
  return (
    <>
      {err && <Banner tone="danger">{err}</Banner>}
      {orders.map((vo: VendorOrder) => {
        const next = NEXT_ORDER[vo.status as keyof typeof NEXT_ORDER];
        return (
          <Card key={vo.id} style={{ borderRadius: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>Order #{vo.id.slice(0, 8).toUpperCase()}</Text>
              <Badge label={vo.status.replace("_", " ")} tone={vo.status === "delivered" ? "ok" : vo.status === "cancelled" ? "neutral" : "info"} />
            </View>
            <Meta>{vo.order?.patient.fullName} · {dayTime(vo.createdAt)}</Meta>
            <Text>{vo.items.length} item(s) · <Text style={{ fontFamily: "Inter_700Bold" }}>{kes(vo.subtotalKes)}</Text></Text>
            <Meta>{vo.order?.deliveryAddress}</Meta>
            {next && <Button title={`Mark ${next}`} size="sm" loading={busy === vo.id} onPress={() => run(vo.id, () => api.patchVendorOrder(vo.id, { status: next }), list.reload)} />}
          </Card>
        );
      })}
    </>
  );
}

const NEXT_AMB: Record<string, PatchAmbulanceRequestInput["status"]> = { dispatched: "en_route_pickup", en_route_pickup: "arrived_pickup", arrived_pickup: "en_route_destination", en_route_destination: "completed" };
function Dispatch() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const q = useAsync(() => api.vendorAmbulanceQueue(pos ? pos : {}), [pos?.lat, pos?.lng]);
  const [fee, setFee] = useState<Record<string, string>>({});
  const { busy, err, run, setErr } = useAct();
  async function share() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error("Allow location access to see nearby requests.");
      const p = await Location.getCurrentPositionAsync({});
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
    } catch (e) { setErr(errorMessage(e)); }
  }
  const own = q.data?.own ?? []; const unassigned = q.data?.unassigned ?? [];
  return (
    <>
      <Button variant="secondary" size="sm" title={pos ? "Location set — showing nearby requests" : "Share your base location to see nearby requests"} onPress={share} />
      {(err || q.error) && <Banner tone="danger">{err ?? q.error}</Banner>}
      {q.loading && !q.data ? <Loading /> : own.length === 0 && unassigned.length === 0 ? <Empty icon="medical-outline" title="No requests right now" /> : (
        <>
          {unassigned.length > 0 && <Text variant="subheading">Nearby requests</Text>}
          {unassigned.map((r) => (
            <Card key={r.id} style={{ borderRadius: 16, borderColor: "#FDE68A", backgroundColor: "#FFFBEB" }}>
              <Text style={{ fontFamily: "Inter_700Bold", textTransform: "capitalize" }}>{r.type.replace(/_/g, " ")} · {r.urgency}</Text>
              <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><MapPin size={14} color="#475569" /><Text>{r.pickupAddress}, {r.pickupCounty}</Text></View>
              <Text tone="muted">{r.patientCondition}</Text>
              <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}><Phone size={12} color="#94A3B8" /><Meta>{r.contactPhone} · {dayTime(r.createdAt)}</Meta></View>
              <Button variant="danger" title="Accept" size="sm" loading={busy === r.id} onPress={() => run(r.id, () => api.acceptAmbulanceRequest(r.id, {}), q.reload)} />
            </Card>
          ))}
          <Text variant="subheading">Your active requests</Text>
          {own.length === 0 ? <Text tone="faint">None yet.</Text> : own.map((r) => {
            const next = NEXT_AMB[r.status];
            return (
              <Card key={r.id} style={{ borderRadius: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", textTransform: "capitalize", flex: 1 }}>{r.type.replace(/_/g, " ")} · {r.urgency}</Text>
                  <Badge label={r.status.replace(/_/g, " ")} tone={r.status === "completed" ? "ok" : "info"} />
                </View>
                <Meta>{r.patient.fullName} · {dayTime(r.createdAt)}</Meta>
                <Text>{r.pickupAddress}, {r.pickupCounty}</Text>
                {r.destinationName ? <Text tone="muted">→ {r.destinationName}</Text> : null}
                {r.status === "accepted" && <Button title="Mark dispatched" size="sm" loading={busy === r.id} onPress={() => run(r.id, () => api.patchVendorAmbulanceRequest(r.id, { status: "dispatched" }), q.reload)} />}
                {next && r.status !== "accepted" && (
                  <View style={{ gap: 8 }}>
                    {r.status === "en_route_destination" && <Field label="Fee (KES)" value={fee[r.id] ?? ""} onChangeText={(v) => setFee((f) => ({ ...f, [r.id]: v.replace(/\D/g, "") }))} keyboardType="number-pad" />}
                    <Button title={`Mark ${next.replace(/_/g, " ")}`} size="sm" loading={busy === r.id} onPress={() => {
                      const input: PatchAmbulanceRequestInput = { status: next };
                      if (next === "completed") { const f = parseInt(fee[r.id] ?? "", 10); if (!f || f <= 0) { Alert.alert("Enter a fee before marking completed."); return; } input.feeKes = f; }
                      void run(r.id, () => api.patchVendorAmbulanceRequest(r.id, input), q.reload);
                    }} />
                  </View>
                )}
              </Card>
            );
          })}
        </>
      )}
    </>
  );
}

const AMB_TYPES = [{ value: "basic", label: "Basic" }, { value: "advanced_life_support", label: "Advanced Life Support" }, { value: "icu", label: "ICU" }, { value: "neonatal", label: "Neonatal" }, { value: "mortuary", label: "Mortuary" }] as const;
function Fleet() {
  const list = useAsync(() => api.listVendorAmbulances().then((r) => r.ambulances), []);
  const [adding, setAdding] = useState(false); const [plate, setPlate] = useState(""); const [type, setType] = useState<CreateAmbulanceInput["type"]>("basic");
  const { busy, err, run } = useAct();
  const items = list.data ?? [];
  return (
    <>
      <AddBar count={items.length} noun="vehicle(s)" label="Add vehicle" onAdd={() => setAdding(true)} />
      {(err || list.error) && <Banner tone="danger">{err ?? list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty icon="car-outline" title="No vehicles yet" /> : items.map((a) => (
        <Card key={a.id} style={{ borderRadius: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_700Bold" }}>{a.plateNumber}</Text><Text tone="muted" style={{ textTransform: "capitalize" }}>{a.type.replace(/_/g, " ")} · crew of {a.crewSize}</Text></View>
            <Button title={a.isAvailable ? "Available" : "Unavailable"} size="sm" variant={a.isAvailable ? "primary" : "secondary"} loading={busy === a.id} onPress={() => run(a.id, () => api.patchVendorAmbulance(a.id, { isAvailable: !a.isAvailable }), list.reload)} />
          </View>
        </Card>
      ))}
      {adding && (
        <FormSheet title="Add vehicle" onClose={() => setAdding(false)}>
          <Field label="Plate number" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          <Select label="Type" value={type} options={[...AMB_TYPES]} onChange={setType} />
          {err && <Banner tone="danger">{err}</Banner>}
          <Button title="Save" loading={busy === "add"} disabled={!plate.trim()} onPress={() => run("add", () => api.createVendorAmbulance({ plateNumber: plate, type, crewSize: 2 }), () => { setPlate(""); setAdding(false); void list.reload(); })} />
        </FormSheet>
      )}
    </>
  );
}

function LabTests() {
  const list = useAsync(() => api.listVendorLabTests().then((r) => r.tests), []);
  const [adding, setAdding] = useState(false); const [name, setName] = useState(""); const [cat, setCat] = useState(""); const [price, setPrice] = useState("");
  const { busy, err, run } = useAct();
  const items = list.data ?? [];
  return (
    <>
      <AddBar count={items.length} noun="test(s)" label="Add test" onAdd={() => setAdding(true)} />
      {(err || list.error) && <Banner tone="danger">{err ?? list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty icon="flask-outline" title="No tests yet" /> : items.map((t: LabTest) => (
        <Card key={t.id} style={{ borderRadius: 16, opacity: t.isActive ? 1 : 0.55 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_700Bold" }}>{t.name}</Text><Text tone="muted">{t.category} · {kes(t.priceKes)}</Text></View>
            <Button title={t.isActive ? "Deactivate" : "Activate"} size="sm" variant={t.isActive ? "secondary" : "primary"} loading={busy === t.id} onPress={() => run(t.id, () => api.patchVendorLabTest(t.id, { isActive: !t.isActive }), list.reload)} />
          </View>
        </Card>
      ))}
      {adding && (
        <FormSheet title="Add test" onClose={() => setAdding(false)}>
          <Field label="Test name" value={name} onChangeText={setName} placeholder="e.g. Full Blood Count" />
          <Field label="Category" value={cat} onChangeText={setCat} />
          <Field label="Price (KES)" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ""))} keyboardType="number-pad" />
          {err && <Banner tone="danger">{err}</Banner>}
          <Button title="Save" loading={busy === "add"} disabled={!name.trim() || !cat.trim() || !(parseInt(price, 10) > 0)} onPress={() => run("add", () => api.createVendorLabTest({ name, category: cat, priceKes: parseInt(price, 10) }), () => { setName(""); setCat(""); setPrice(""); setAdding(false); void list.reload(); })} />
        </FormSheet>
      )}
    </>
  );
}

const NEXT_LAB: Record<string, PatchLabOrderInput["status"]> = { requested: "accepted", accepted: "sample_collected", sample_collected: "processing" };
function LabOrders() {
  const list = useAsync(() => api.listVendorLabOrders({ limit: 50 } as never).then((r) => r.orders), []);
  const [resulting, setResulting] = useState<LabOrderItem | null>(null);
  const { busy, err, run } = useAct();
  const orders = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  if (orders.length === 0) return <Empty icon="flask-outline" title="No lab orders yet" />;
  return (
    <>
      {err && <Banner tone="danger">{err}</Banner>}
      {orders.map((o: LabOrder) => {
        const next = NEXT_LAB[o.status];
        return (
          <Card key={o.id} style={{ borderRadius: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{o.patient.fullName}</Text>
              <Badge label={o.status.replace(/_/g, " ")} tone={o.status === "resulted" ? "ok" : o.status === "cancelled" ? "neutral" : "info"} />
            </View>
            <Meta>{dayTime(o.createdAt)} · {kes(o.totalKes)}</Meta>
            {o.items.map((i) => (
              <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text>{i.testName}</Text>
                {!i.result && ["sample_collected", "processing"].includes(o.status) && <Button title="Enter result" size="sm" variant="secondary" onPress={() => setResulting(i)} />}
                {i.result && <Badge label={`${i.result.value}${i.result.unit ? ` ${i.result.unit}` : ""}`} tone="ok" />}
              </View>
            ))}
            {next && <Button title={`Mark ${next.replace("_", " ")}`} size="sm" loading={busy === o.id} onPress={() => run(o.id, () => api.patchVendorLabOrder(o.id, { status: next }), list.reload)} />}
          </Card>
        );
      })}
      {resulting && <ResultSheet item={resulting} onClose={() => setResulting(null)} onSaved={() => { setResulting(null); void list.reload(); }} />}
    </>
  );
}

function ResultSheet({ item, onClose, onSaved }: { item: LabOrderItem; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(""); const [unit, setUnit] = useState(""); const [range, setRange] = useState(""); const [flag, setFlag] = useState<string>("");
  const { busy, err, run } = useAct();
  return (
    <FormSheet title={`Enter result — ${item.testName}`} onClose={onClose}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Field label="Value" value={value} onChangeText={setValue} /></View>
        <View style={{ flex: 1 }}><Field label="Unit" value={unit} onChangeText={setUnit} /></View>
      </View>
      <Field label="Reference range (optional)" value={range} onChangeText={setRange} />
      <Select label="Flag" value={flag} placeholder="No flag" options={[{ value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "low", label: "Low" }, { value: "critical", label: "Critical" }]} onChange={setFlag} />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Save result" loading={busy === "save"} disabled={!value.trim()} onPress={() => run("save", () => api.enterLabResult(item.id, { value, unit: unit || undefined, referenceRange: range || undefined, flag: (flag || undefined) as EnterLabResultInput["flag"] }), onSaved)} />
    </FormSheet>
  );
}

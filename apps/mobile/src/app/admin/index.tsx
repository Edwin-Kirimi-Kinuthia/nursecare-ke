import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ShieldCheck, Star } from "lucide-react-native";
import type { Appointment, AdminUserSummary, HomeVisit, Order, Organization, ProviderPublicProfile, Review, VerificationProvider } from "@carebora/api-client";
import { useAuth } from "@/lib/auth";
import { useAppConfig } from "@/lib/appConfig";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useAct } from "@/lib/useAct";
import { dayTime, kes } from "@/lib/format";
import { openSite } from "@/lib/links";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FormSheet } from "@/ui/FormSheet";
import { NameFields } from "@/ui/NameFields";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import { DateTimeField } from "@/ui/DateTimeField";
import { TabBar } from "@/ui/TabBar";
import { Text } from "@/ui/Text";
import { Avatar, Badge, Banner, Chip, Empty, Loading } from "@/ui/parts";
import { PageHeader } from "@/ui/PageHeader";
import { EMPTY_NAME, composeFullName, splitFullName, type AdminPatchUserInput, type NameParts, type TillVerificationItem } from "@carebora/shared";
import { PharmacyAdmin } from "@/features/admin/PharmacyAdmin";
import { SupportAdmin } from "@/features/admin/SupportAdmin";
import { Overview } from "@/features/admin/Overview";

type Tab = "overview" | "appointments" | "users" | "verifications" | "organizations" | "pharmacy" | "orders" | "home-visits" | "support" | "pay-verify" | "reviews" | "audit";

export default function AdminDashboard() {
  const { user } = useAuth();
  const config = useAppConfig();
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => { if (user && user.role !== "admin") router.replace("/"); }, [user]);
  const stats = useAsync(() => (user?.role === "admin" ? api.adminGetStats() : Promise.resolve(null)), [user?.id]);
  if (!user || user.role !== "admin") return <Loading />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" }, { id: "appointments", label: "Appointments" }, { id: "users", label: "Users" }, { id: "verifications", label: "Applications" },
    { id: "organizations", label: "Vendors" }, { id: "pharmacy", label: "Pharmacy" }, { id: "orders", label: "Orders" }, { id: "home-visits", label: "Home visits" }, { id: "support", label: "Messages" },
    ...(config?.payments.mode === "till" ? [{ id: "pay-verify" as Tab, label: "Verify payments" }] : []),
    { id: "reviews", label: "Reviews" }, { id: "audit", label: "Audit log" },
  ];
  return (
    <Screen onRefresh={stats.reload} refreshing={stats.refreshing} contentContainerStyle={{ paddingBottom: 72 }}>
      <PageHeader eyebrow="Admin" Icon={ShieldCheck} title="Operations dashboard" />
      <TabBar value={tab} tabs={tabs} onChange={setTab} />
      {tab === "overview" && <Overview stats={stats.data} loading={stats.loading} error={stats.error} />}
      {tab === "appointments" && <Appointments />}
      {tab === "users" && <Users />}
      {tab === "verifications" && <Verifications />}
      {tab === "organizations" && <Organizations />}
      {tab === "pharmacy" && <PharmacyAdmin />}
      {tab === "orders" && <Orders />}
      {tab === "home-visits" && <HomeVisits />}
      {tab === "support" && <SupportAdmin />}
      {tab === "pay-verify" && <PayVerify />}
      {tab === "reviews" && <Reviews />}
      {tab === "audit" && <Audit />}
    </Screen>
  );
}

const Meta = ({ children }: { children: React.ReactNode }) => <Text variant="caption" tone="faint">{children}</Text>;
function FilterChips<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => <Chip key={o} label={o.replace(/_/g, " ")} selected={value === o} onPress={() => onChange(o)} />)}
    </ScrollView>
  );
}

const APPT_STATUS = ["all", "requested", "confirmed", "completed", "cancelled", "no_show"] as const;
function Appointments() {
  const list = useAsync(() => api.adminListAppointments({ limit: 50 } as never).then((r) => r.appointments), []);
  const [filter, setFilter] = useState<(typeof APPT_STATUS)[number]>("all");
  const items = (list.data ?? []).filter((a) => filter === "all" || a.status === filter);
  return (
    <>
      <FilterChips value={filter} options={APPT_STATUS} onChange={setFilter} />
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty icon="calendar-outline" title="No appointments" /> : items.map((a: Appointment) => (
        <Card key={a.id} style={{ borderRadius: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontFamily: "Inter_700Bold", flex: 1 }}>{a.patient?.fullName ?? "—"}</Text>
            <Badge label={a.status.replace("_", " ")} tone={a.status === "confirmed" || a.status === "completed" ? "ok" : a.status === "requested" ? "warn" : "danger"} />
          </View>
          <Text tone="muted">with {a.provider?.user?.fullName ?? "—"} · {a.appointmentType.replace("_", " ")}</Text>
          <Meta>{a.slot ? dayTime(a.slot.startsAt) : "—"} · {kes(a.feeKes)}</Meta>
        </Card>
      ))}
    </>
  );
}

const ROLE_FILTERS = ["all", "patient", "doctor", "nurse", "physio", "pharmacy", "admin"] as const;
function Users() {
  const list = useAsync(() => api.adminListUsers({ limit: 100 } as never).then((r) => r.users), []);
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { busy, err, run } = useAct();
  const users = (list.data ?? []).filter((u) => role === "all" || u.role === role);
  return (
    <>
      <FilterChips value={role} options={ROLE_FILTERS} onChange={setRole} />
      <Button title="Create provider account" size="sm" onPress={() => setCreating(true)} />
      {notice && <Banner tone="info">{notice}</Banner>}
      {(err || list.error) && <Banner tone="danger">{err ?? list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : users.map((u: AdminUserSummary) => (
        <Card key={u.id} style={{ borderRadius: 16 }}>
          <Pressable onPress={() => setOpen(u.id)} accessibilityRole="button" style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar name={u.fullName} uri={u.avatarUrl} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold" }} numberOfLines={1}>{u.fullName}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>{u.email}</Text>
            </View>
            <View style={{ gap: 4, alignItems: "flex-end" }}><Badge label={u.role} /><Badge label={u.isActive ? "Active" : "Disabled"} tone={u.isActive ? "ok" : "danger"} /></View>
          </Pressable>
          {u.role !== "admin" && <Button title={u.isActive ? "Disable" : "Enable"} size="sm" variant={u.isActive ? "secondary" : "primary"} loading={busy === u.id} onPress={() => run(u.id, () => api.adminPatchUser(u.id, { isActive: !u.isActive }), list.reload)} />}
        </Card>
      ))}
      {open && <UserSheet userId={open} onClose={() => setOpen(null)} onSaved={list.reload} />}
      {creating && <CreateProviderSheet onClose={() => setCreating(false)} onCreated={(email) => { setCreating(false); setNotice(`Account created — an invite to set a password was emailed to ${email}.`); void list.reload(); }} />}
    </>
  );
}

const PROVIDER_ROLES = [{ value: "doctor", label: "Doctor" }, { value: "nurse", label: "Nurse" }, { value: "physio", label: "Physiotherapist" }, { value: "pharmacy", label: "Pharmacy" }] as const;
function CreateProviderSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string) => void }) {
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [role, setRole] = useState<"doctor" | "nurse" | "physio" | "pharmacy">("doctor");
  const [specialty, setSpecialty] = useState(""); const [licence, setLicence] = useState("");
  const { busy, err, run } = useAct();
  return (
    <FormSheet title="Create provider account" onClose={onClose}>
      <Meta>Skips the public apply-and-review queue — use this once you&apos;ve already vetted them. They&apos;ll get an email to set their own password.</Meta>
      <NameFields value={name} onChange={setName} showTitle />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <PhoneField label="Phone (optional)" value={phone} onChange={setPhone} />
      <Select label="Role" value={role} options={[...PROVIDER_ROLES]} onChange={setRole} />
      <Field label="Specialty (optional)" value={specialty} onChangeText={setSpecialty} />
      <Field label="Licence number (optional)" value={licence} onChangeText={setLicence} />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Create & send invite" loading={busy === "c"} disabled={!name.firstName.trim() || !name.surname.trim() || !email.includes("@")}
        onPress={() => run("c", () => api.adminCreateProvider({ fullName: composeFullName(name), email: email.trim().toLowerCase(), phone: phone || undefined, role, specialty: specialty || undefined, licenceNumber: licence || undefined }), () => onCreated(email))} />
    </FormSheet>
  );
}

const VERIFICATION = ["unverified", "pending", "in_review", "verified", "rejected"] as const;
function UserSheet({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const res = useAsync(() => api.adminGetUser(userId), [userId]);
  const [name, setName] = useState<NameParts>(EMPTY_NAME); const [phone, setPhone] = useState(""); const [prov, setProv] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const { busy, err, run } = useAct();
  const user = res.data;
  useEffect(() => {
    if (!user || hydrated) return;
    const p = user.providerProfile;
    const t = setTimeout(() => {
      setName(splitFullName(user.fullName)); setPhone(user.phone ?? "");
      if (p) setProv({ specialty: p.specialty ?? "", subSpecialty: p.subSpecialty ?? "", licenceNumber: p.licenceNumber ?? "", licenceBody: p.licenceBody ?? "", county: p.county ?? "", town: p.town ?? "", consultationFeeKes: String(p.consultationFeeKes ?? ""), homeVisitFeeKes: String(p.homeVisitFeeKes ?? ""), yearsExperience: String(p.yearsExperience ?? ""), verificationStatus: p.verificationStatus, bio: p.bio ?? "" });
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, [user, hydrated]);
  const set = (k: string) => (v: string) => setProv((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v.trim() === "" ? undefined : parseInt(v, 10));
  function save() {
    if (!user) return;
    const input: AdminPatchUserInput = {
      fullName: composeFullName(name), phone: phone.trim(),
      ...(user.providerProfile ? { providerProfile: {
        specialty: prov.specialty || undefined, subSpecialty: prov.subSpecialty || undefined, licenceNumber: prov.licenceNumber || undefined, licenceBody: prov.licenceBody || undefined,
        county: prov.county || undefined, town: prov.town || undefined, bio: prov.bio || undefined,
        consultationFeeKes: num(prov.consultationFeeKes ?? ""), homeVisitFeeKes: num(prov.homeVisitFeeKes ?? ""), yearsExperience: num(prov.yearsExperience ?? ""),
        verificationStatus: prov.verificationStatus as (typeof VERIFICATION)[number],
      } } : {}),
    } as AdminPatchUserInput;
    void run("save", () => api.adminPatchUser(userId, input), () => { onSaved(); onClose(); });
  }
  return (
    <FormSheet title="User record" onClose={onClose}>
      {res.loading && !user ? <Loading /> : !user ? <Banner tone="danger">{res.error ?? "Could not load this user."}</Banner> : (
        <>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar name={user.fullName} uri={user.avatarUrl} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{user.fullName}</Text><Text tone="muted" numberOfLines={1}>{user.email}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}><Badge label={user.role} /><Badge label={user.isActive ? "Active" : "Disabled"} tone={user.isActive ? "ok" : "danger"} /><Badge label={user.emailVerifiedAt ? "Email verified" : "Email unverified"} tone={user.emailVerifiedAt ? "info" : "warn"} /></View>
            </View>
          </View>
          <NameFields value={name} onChange={setName} showTitle={!!user.providerProfile} />
          <PhoneField label="Phone" value={phone} onChange={setPhone} />
          <Meta>Email is the login identity and where every security code goes, so it isn&apos;t editable here.</Meta>
          {user.providerProfile && (
            <View style={{ gap: 12, backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: "#99F6E4", borderRadius: 14, padding: 12 }}>
              <Text style={{ color: "#0F766E", fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.6 }}>PROVIDER DETAILS</Text>
              <Field label="Specialty" value={prov.specialty ?? ""} onChangeText={set("specialty")} />
              <Field label="Sub-specialty" value={prov.subSpecialty ?? ""} onChangeText={set("subSpecialty")} />
              <Field label="Licence number" value={prov.licenceNumber ?? ""} onChangeText={set("licenceNumber")} />
              <Field label="Licence body" value={prov.licenceBody ?? ""} onChangeText={set("licenceBody")} />
              <Field label="County" value={prov.county ?? ""} onChangeText={set("county")} />
              <Field label="Town" value={prov.town ?? ""} onChangeText={set("town")} />
              <Field label="Consultation fee (KES)" value={prov.consultationFeeKes ?? ""} onChangeText={(v) => set("consultationFeeKes")(v.replace(/\D/g, ""))} keyboardType="number-pad" />
              <Field label="Home visit fee (KES)" value={prov.homeVisitFeeKes ?? ""} onChangeText={(v) => set("homeVisitFeeKes")(v.replace(/\D/g, ""))} keyboardType="number-pad" />
              <Field label="Years of experience" value={prov.yearsExperience ?? ""} onChangeText={(v) => set("yearsExperience")(v.replace(/\D/g, ""))} keyboardType="number-pad" />
              <Select label="Verification" value={prov.verificationStatus ?? "unverified"} options={VERIFICATION.map((v) => ({ value: v, label: v.replace("_", " ") }))} onChange={set("verificationStatus")} />
              <Field label="Bio" value={prov.bio ?? ""} onChangeText={set("bio")} multiline style={{ minHeight: 70, textAlignVertical: "top", paddingTop: 12 }} />
            </View>
          )}
          {user.verificationDocuments.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text variant="label" tone="muted">UPLOADED DOCUMENTS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {user.verificationDocuments.map((d) => <Chip key={d.id} label={d.type.replace(/_/g, " ")} onPress={() => void openSite(d.fileUrl)} />)}
              </View>
            </View>
          )}
          {user.sessions.length > 0 && <Meta>{user.sessions.length} active session{user.sessions.length === 1 ? "" : "s"}</Meta>}
          {err && <Banner tone="danger">{err}</Banner>}
          <Button title="Save changes" loading={busy === "save"} onPress={save} />
        </>
      )}
    </FormSheet>
  );
}

function Verifications() {
  const list = useAsync(() => api.adminListVerifications({} as never).then((r) => r.providers), []);
  const { busy, err, run } = useAct();
  const items = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  if (items.length === 0) return <Empty icon="shield-checkmark-outline" title="No providers in the queue" />;
  return (
    <>
      {err && <Banner tone="danger">{err}</Banner>}
      {items.map((v: VerificationProvider) => {
        const doc = v.user.verificationDocuments.find((d) => d.type === "practice_licence");
        return (
          <Card key={v.userId} style={{ borderRadius: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Avatar name={v.user.fullName} uri={v.user.avatarUrl} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_700Bold" }}>{v.user.fullName}</Text>
                <Text style={{ color: "#0F766E" }}>{v.specialty ?? "Clinician"}</Text>
                <Meta>{v.user.email} · Licence {v.licenceNumber ?? "—"}</Meta>
              </View>
              <Badge label={v.verificationStatus.replace("_", " ")} tone={v.verificationStatus === "verified" ? "ok" : v.verificationStatus === "rejected" ? "danger" : "warn"} />
            </View>
            {doc && <Text onPress={() => void openSite(doc.fileUrl)} style={{ color: "#0F766E", fontFamily: "Inter_600SemiBold" }}>View licence document →</Text>}
            {v.verificationStatus !== "verified" && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Button title="Approve" size="sm" loading={busy === v.userId + "a"} onPress={() => run(v.userId + "a", () => api.adminReviewVerification(v.userId, { status: "verified" }), list.reload)} /></View>
                <View style={{ flex: 1 }}><Button title="Reject" size="sm" variant="secondary" loading={busy === v.userId + "r"} onPress={() => run(v.userId + "r", () => api.adminReviewVerification(v.userId, { status: "rejected" }), list.reload)} /></View>
              </View>
            )}
          </Card>
        );
      })}
    </>
  );
}

const ORG_FILTERS = ["all", "pending", "approved", "suspended"] as const;
function Organizations() {
  const list = useAsync(() => api.adminListOrganizations({ limit: 100 } as never).then((r) => r.organizations), []);
  const [filter, setFilter] = useState<(typeof ORG_FILTERS)[number]>("all");
  const { busy, err, run } = useAct();
  const items = (list.data ?? []).filter((o) => filter === "all" ? true : filter === "pending" ? o.status === "pending" || o.status === "in_review" : o.status === filter);
  const review = (o: Organization, status: "approved" | "rejected" | "suspended") => run(o.id + status, () => api.adminReviewOrganization(o.id, { status }), list.reload);
  return (
    <>
      <FilterChips value={filter} options={ORG_FILTERS} onChange={setFilter} />
      {(err || list.error) && <Banner tone="danger">{err ?? list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty icon="business-outline" title="No vendor applications" /> : items.map((o) => (
        <Card key={o.id} style={{ borderRadius: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>{o.name}</Text>
              <Meta>{o.type} · Licence {o.licenceNumber ?? "—"} · {o.branches.length} branch(es){o.branches[0] ? ` · ${o.branches[0].county}` : ""}</Meta>
            </View>
            <Badge label={o.status.replace("_", " ")} tone={o.status === "approved" ? "ok" : o.status === "suspended" || o.status === "rejected" ? "danger" : "warn"} />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(o.status === "pending" || o.status === "in_review") && (<>
              <View style={{ flex: 1 }}><Button title="Approve" size="sm" loading={busy === o.id + "approved"} onPress={() => review(o, "approved")} /></View>
              <View style={{ flex: 1 }}><Button title="Reject" size="sm" variant="secondary" loading={busy === o.id + "rejected"} onPress={() => review(o, "rejected")} /></View>
            </>)}
            {o.status === "approved" && <View style={{ flex: 1 }}><Button title="Suspend" size="sm" variant="secondary" loading={busy === o.id + "suspended"} onPress={() => review(o, "suspended")} /></View>}
            {o.status === "suspended" && <View style={{ flex: 1 }}><Button title="Reinstate" size="sm" loading={busy === o.id + "approved"} onPress={() => review(o, "approved")} /></View>}
          </View>
        </Card>
      ))}
    </>
  );
}

function Orders() {
  const list = useAsync(() => api.adminListOrders({ limit: 50 } as never).then((r) => r.orders), []);
  const orders = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  if (orders.length === 0) return <Empty icon="cube-outline" title="No orders yet" />;
  return (
    <>
      {orders.map((o: Order) => {
        const n = o.vendorOrders.reduce((a, vo) => a + vo.items.reduce((m, i) => m + i.qty, 0), 0);
        return (
          <Card key={o.id} style={{ borderRadius: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: "Inter_700Bold" }}>Order #{o.id.slice(0, 8).toUpperCase()}</Text>
              <Badge label={o.payment?.status ?? "unpaid"} tone={o.payment?.status === "completed" ? "ok" : "neutral"} />
            </View>
            <Meta>{o.patient.fullName} · {dayTime(o.createdAt)}</Meta>
            <Text>{n} item(s) across {o.vendorOrders.length} vendor(s) · <Text style={{ fontFamily: "Inter_700Bold" }}>{kes(o.totalKes)}</Text></Text>
            <Meta>{o.deliveryAddress}</Meta>
            {o.vendorOrders.map((vo) => (
              <View key={vo.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>{vo.organization.name} · {vo.items.reduce((a, i) => a + i.qty, 0)} item(s)</Text>
                <Badge label={vo.status.replace("_", " ")} tone={vo.status === "delivered" ? "ok" : vo.status === "cancelled" ? "neutral" : "info"} />
              </View>
            ))}
          </Card>
        );
      })}
    </>
  );
}

function HomeVisits() {
  const list = useAsync(() => api.listHomeVisits({ limit: 50 } as never).then((r) => r.visits), []);
  const providers = useAsync(() => api.listProviders({ limit: 50 } as never).then((r) => r.providers), []);
  const [assigning, setAssigning] = useState<HomeVisit | null>(null);
  const visits = list.data ?? [];
  return (
    <>
      {list.error && <Banner tone="danger">{list.error}</Banner>}
      {list.loading && !list.data ? <Loading /> : visits.length === 0 ? <Empty icon="home-outline" title="No home visit requests yet" /> : visits.map((v: HomeVisit) => (
        <Card key={v.id} style={{ borderRadius: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontFamily: "Inter_700Bold", textTransform: "capitalize", flex: 1 }}>{v.specialty} · <Text style={{ color: "#0F766E" }}>{v.urgency}</Text></Text>
            <Badge label={v.status.replace("_", " ")} tone={v.status === "completed" || v.status === "arrived" ? "ok" : v.status === "cancelled" ? "neutral" : v.status === "pending" ? "warn" : "info"} />
          </View>
          <Meta>{v.patient.fullName} · {dayTime(v.createdAt)}</Meta>
          <Text tone="muted">{v.description}</Text>
          <Meta>{v.address}, {v.county}</Meta>
          {v.provider && <Text variant="caption" tone="muted">Provider: {v.provider.user.fullName}{v.feeKes ? ` · ${kes(v.feeKes)}` : ""}{v.scheduledAt ? ` · ${dayTime(v.scheduledAt)}` : ""}</Text>}
          {v.status === "pending" && <Button title="Assign provider" size="sm" onPress={() => setAssigning(v)} />}
        </Card>
      ))}
      {assigning && <AssignSheet visit={assigning} providers={providers.data ?? []} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); void list.reload(); }} />}
    </>
  );
}

function AssignSheet({ visit, providers, onClose, onDone }: { visit: HomeVisit; providers: ProviderPublicProfile[]; onClose: () => void; onDone: () => void }) {
  const eligible = providers.filter((p) => p.user.role === visit.specialty);
  const options = (eligible.length ? eligible : providers).map((p) => ({ value: p.userId, label: `${p.user.fullName}${p.specialty ? ` — ${p.specialty}` : ""}${p.town ? ` · ${p.town}` : ""}` }));
  const [providerId, setProviderId] = useState(""); const [fee, setFee] = useState(""); const [when, setWhen] = useState<Date | null>(null);
  const { busy, err, run } = useAct();
  function pick(id: string) { setProviderId(id); const p = providers.find((x) => x.userId === id); if (p?.homeVisitFeeKes) setFee(String(p.homeVisitFeeKes)); }
  return (
    <FormSheet title="Assign provider" onClose={onClose}>
      <Meta>{visit.specialty} visit for {visit.patient.fullName}</Meta>
      <Select label="Provider" value={providerId} options={options} onChange={pick} placeholder="Select a provider…" />
      <Field label="Fee (KES)" value={fee} onChangeText={(v) => setFee(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="e.g. 2500" />
      <DateTimeField label="Scheduled at" value={when} onChange={setWhen} minimumDate={new Date()} />
      {err && <Banner tone="danger">{err}</Banner>}
      <Button title="Assign provider" loading={busy === "a"} disabled={!providerId || !(parseInt(fee, 10) > 0) || !when}
        onPress={() => run("a", () => api.assignHomeVisit(visit.id, { providerId, feeKes: parseInt(fee, 10), scheduledAt: when!.toISOString() }), onDone)} />
    </FormSheet>
  );
}

const TILL_LABEL: Record<string, string> = { appointment: "Consultation", order: "Pharmacy order", home_visit: "Home visit" };
function PayVerify() {
  const list = useAsync(() => api.adminListTillVerifications().then((r) => r.items), []);
  const { busy, err, run } = useAct();
  const items = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  return (
    <>
      <Banner tone="info">Confirm each M-Pesa code against your Till statement, then approve to unlock the service (or reject to let the patient re-submit).</Banner>
      {err && <Banner tone="danger">{err}</Banner>}
      {items.length === 0 ? <Empty icon="wallet-outline" title="No payments waiting for verification" /> : items.map((item: TillVerificationItem) => (
        <Card key={`${item.context}-${item.id}`} style={{ borderRadius: 16 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Badge label={TILL_LABEL[item.context] ?? item.context} /><Text style={{ color: "#0F766E", fontFamily: "Inter_800ExtraBold", fontSize: 18 }}>{kes(item.amountKes)}</Text></View>
          <Text style={{ fontFamily: "Inter_700Bold" }}>{item.patientName}</Text>
          <Text tone="muted">{item.description}</Text>
          <Meta>Code: {item.code.toUpperCase()}{item.phone ? ` · ${item.phone}` : ""} · {dayTime(item.submittedAt)}</Meta>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Button title="Approve" size="sm" loading={busy === item.id + "a"} onPress={() => run(item.id + "a", () => api.adminVerifyTillPayment({ id: item.id, approve: true }), list.reload)} /></View>
            <View style={{ flex: 1 }}><Button title="Reject" size="sm" variant="secondary" loading={busy === item.id + "r"} onPress={() => run(item.id + "r", () => api.adminVerifyTillPayment({ id: item.id, approve: false }), list.reload)} /></View>
          </View>
        </Card>
      ))}
    </>
  );
}

function Reviews() {
  const list = useAsync(() => api.adminListReviews({ limit: 100 } as never).then((r) => r.reviews), []);
  const { busy, err, run } = useAct();
  const items = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  if (items.length === 0) return <Empty icon="star-outline" title="No reviews yet" />;
  return (
    <>
      {err && <Banner tone="danger">{err}</Banner>}
      {items.map((r: Review) => (
        <Card key={r.id} style={{ borderRadius: 16, backgroundColor: r.isVisible ? "#fff" : "#F8FAFC" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", gap: 2 }}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} color="#F59E0B" fill={i <= r.rating ? "#F59E0B" : "transparent"} />)}</View>
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>{r.patient.fullName}</Text>
            {r.provider && <Meta>→ {r.provider.user.fullName}</Meta>}
            {!r.isVisible && <Badge label="Hidden" />}
          </View>
          {r.comment ? <Text tone="muted">“{r.comment}”</Text> : null}
          <Meta>{dayTime(r.createdAt)}</Meta>
          <Button title={r.isVisible ? "Hide" : "Show"} size="sm" variant={r.isVisible ? "secondary" : "primary"} loading={busy === r.id} onPress={() => run(r.id, () => api.adminModerateReview(r.id, { isVisible: !r.isVisible }), list.reload)} />
        </Card>
      ))}
    </>
  );
}

function Audit() {
  const list = useAsync(() => api.adminListAuditLogs({ limit: 50 } as never).then((r) => r.logs), []);
  const logs = list.data ?? [];
  if (list.loading && !list.data) return <Loading />;
  if (logs.length === 0) return <Empty icon="document-text-outline" title="No audit entries yet" />;
  return <>{logs.map((l) => (
    <Card key={l.id} style={{ borderRadius: 14, padding: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", flex: 1 }}>{l.actor?.fullName ?? "System"}</Text>
        <Meta>{dayTime(l.createdAt)}</Meta>
      </View>
      <Text variant="caption" style={{ fontFamily: "Inter_500Medium", color: "#334155" }}>{l.action}{l.entityType ? ` · ${l.entityType}` : ""}</Text>
    </Card>
  ))}</>;
}

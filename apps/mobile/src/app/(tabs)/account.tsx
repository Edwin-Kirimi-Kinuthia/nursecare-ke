import { useEffect, useState } from "react";
import { Alert, Switch, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { PROVIDER_ROLES } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { callNumber, emailTo, openSite } from "@/lib/links";
import { useContacts } from "@/lib/appConfig";
import { usePushPermission } from "@/lib/push";
import { errorMessage } from "@/lib/useAsync";
import { SignInPrompt } from "@/features/SignInPrompt";
import { Screen, Card } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Avatar, Badge, Banner, Divider, Row } from "@/ui/parts";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const { supportEmail, ambulancePhone } = useContacts();
  const [unread, setUnread] = useState(0);
  const push = usePushPermission(!!user);

  useEffect(() => {
    if (!user) return;
    api.listNotifications().then((r) => setUnread(r.unreadCount)).catch(() => {});
  }, [user]);

  const links = (
    <Card style={{ paddingVertical: 4 }}>
      <Row icon="chatbubbles-outline" title="Message us" subtitle="Questions or a document request" onPress={() => router.push(user ? "/support" : "/support/new")} />
      <Divider />
      <Row icon="medical-outline" title="Ambulance" subtitle={ambulancePhone} onPress={() => callNumber(ambulancePhone)} />
      <Divider />
      <Row icon="shield-checkmark-outline" title="Privacy policy" onPress={() => openSite("/privacy")} />
      <Divider />
      <Row icon="information-circle-outline" title="About Care Bora" onPress={() => openSite("/about")} />
      <Divider />
      <Row icon="mail-outline" title="Email support" subtitle={supportEmail} onPress={() => emailTo(supportEmail)} />
    </Card>
  );

  if (!user) {
    return (
      <Screen>
        <SignInPrompt icon="person-outline" title="Sign in to Care Bora" hint="Book consultations, pay with M-Pesa and keep your records in one place." />
        {links}
      </Screen>
    );
  }

  const isProvider = PROVIDER_ROLES.includes(user.role);
  const isVendor = user.role === "vendor";
  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Avatar name={user.fullName} uri={user.avatarUrl} size={64} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="heading">{user.fullName}</Text>
            <Text tone="muted" numberOfLines={1}>{user.email}</Text>
            <View style={{ flexDirection: "row" }}><Badge label={user.role} tone="info" /></View>
          </View>
        </View>
      </Card>

      {!user.emailVerified && (
        <Card>
          <Banner tone="warn">Your email isn&apos;t verified yet. Verify it so we can reach you about your care.</Banner>
          <Button title="Verify email" size="sm" onPress={() => router.push("/verify-email")} />
        </Card>
      )}

      {isProvider && <AvailabilityCard />}

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="create-outline" title="Edit profile" subtitle="Name, phone and photo" onPress={() => router.push("/edit-profile")} />
        <Divider />
        <Row icon="person-outline" title="Personal details" subtitle="Blood group, allergies, emergency contact" onPress={() => router.push("/edit-details")} />
        <Divider />
        {isProvider && (
          <>
            <Row icon="medkit-outline" title="Professional profile" subtitle="Specialty, fees, bio" onPress={() => router.push("/edit-professional")} />
            <Divider />
          </>
        )}
        <Row icon="document-text-outline" title="Medical record" subtitle="Allergies, medicines, results, notes" onPress={() => router.push("/records")} />
        <Divider />
        <Row icon="key-outline" title="Change password" onPress={() => router.push("/change-password")} />
        <Divider />
        <Row
          icon="notifications-outline"
          title="Notifications"
          onPress={() => router.push("/notifications")}
          trailing={unread > 0 ? <Badge label={String(unread)} tone="danger" /> : undefined}
        />
        {push.permission !== "granted" && (
          <>
            <Divider />
            <Row
              icon="notifications-off-outline"
              title="Turn on push notifications"
              subtitle={push.permission === "denied" ? "Blocked. Open Settings to allow them." : "Hear when your doctor confirms or starts your call"}
              onPress={push.enable}
            />
          </>
        )}
      </Card>

      {user.role === "admin" && (
        <Card><Text variant="subheading">Administrator</Text><Text tone="muted">Manage the platform from the operations dashboard.</Text><Button title="Open dashboard" size="sm" onPress={() => router.push("/admin")} /></Card>
      )}
      {isVendor && (
        <Card><Text variant="subheading">Vendor</Text><Text tone="muted">Manage your listings, orders and branches.</Text><Button title="Open vendor dashboard" size="sm" onPress={() => router.push("/vendor")} /></Card>
      )}

      {links}

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="trash-outline" title="Delete account" subtitle="Permanently remove your account and data" tone="danger" onPress={() => router.push("/delete-account")} />
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => Alert.alert("Sign out?", "You'll need to sign in again to see your appointments.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => void signOut() }])} />
      <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>Care Bora {Constants.expoConfig?.version}</Text>
    </Screen>
  );
}

/** Providers only: the live Available / Busy switch. Applies immediately, as on the website. */
function AvailabilityCard() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProviderProfile().then((p) => setAvailable(p.isAvailable)).catch(() => {});
  }, []);

  async function toggle(next: boolean) {
    const prev = available;
    setAvailable(next);
    setError(null);
    try { await api.patchProviderProfile({ isAvailable: next }); }
    catch (err) { setAvailable(prev); setError(errorMessage(err)); }
  }

  if (available === null) return null;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading">{available ? "Available" : "Busy"}</Text>
          <Text variant="caption" tone="muted">
            {available ? "New bookings are confirmed instantly." : "Patients can still book, but you confirm each one first."}
          </Text>
        </View>
        <Switch value={available} onValueChange={toggle} accessibilityLabel="Available for instant bookings" />
      </View>
      {error && <Text variant="caption" tone="danger">{error}</Text>}
    </Card>
  );
}

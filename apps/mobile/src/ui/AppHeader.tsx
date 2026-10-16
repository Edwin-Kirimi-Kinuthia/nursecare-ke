import { useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bell, Building2, Package, ShoppingCart, CalendarDays, ChevronLeft, Ambulance, LogIn, LogOut, Menu, MessageCircle, Phone, Pill, ShieldCheck,
  Stethoscope, User, X, type LucideIcon,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { openSite } from "@/lib/links";
import { Avatar } from "./parts";
import { Text } from "./Text";
import { NAVY, useTheme } from "./theme";

const TOP_LEVEL = new Set(["/", "/doctors", "/appointments", "/account", "/login", "/register", "/forgot", "/otp"]);

/** Same layout as the website's phone nav: menu on the left, logo, then login or the signed-in person on the right. */
export function AppHeader() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/consultation/")) return null;

  const nested = !TOP_LEVEL.has(pathname) && router.canGoBack();
  return (
    <>
      <View style={{ paddingTop: insets.top, backgroundColor: "rgba(255,255,255,0.97)", borderBottomWidth: 1, borderBottomColor: t.border }}>
        <View style={{ height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 6 }}>
          {nested ? (
            <IconButton label="Go back" onPress={() => router.back()}><ChevronLeft size={26} color={t.text} /></IconButton>
          ) : null}
          <IconButton label="Open menu" onPress={() => setOpen(true)}><Menu size={24} color={t.text} /></IconButton>
          <Pressable onPress={() => router.navigate("/")} accessibilityRole="link" accessibilityLabel="Care Bora home"
            style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Image source={require("../../assets/brand/logo-mark.png")} style={{ width: 36, height: 36 }} resizeMode="contain" />
            <Text style={{ fontFamily: "Inter_800ExtraBold", fontSize: 18, letterSpacing: -0.3 }}>Care Bora</Text>
          </Pressable>
          <IconButton label={`Cart, ${count} items`} onPress={() => router.navigate("/cart")}>
            <ShoppingCart size={22} color={t.textMuted} />
            {count > 0 && (
              <View style={{ position: "absolute", top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#0D9488", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{count}</Text>
              </View>
            )}
          </IconButton>
          {user ? (
            <>
              <IconButton label="Notifications" onPress={() => router.push("/notifications")}><Bell size={22} color={t.textMuted} /></IconButton>
              <Pressable onPress={() => router.navigate("/account")} accessibilityRole="button" accessibilityLabel="My profile">
                <Avatar name={user.fullName} uri={user.avatarUrl} size={36} />
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => router.navigate("/login")} accessibilityRole="button"
              style={{ backgroundColor: NAVY, borderRadius: 14, paddingHorizontal: 16, height: 40, justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Log in</Text>
            </Pressable>
          )}
        </View>
      </View>
      <MenuDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function IconButton({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, opacity: pressed ? 0.5 : 1 })}>
      {children}
    </Pressable>
  );
}

type Item = { label: string; Icon: LucideIcon; to?: string; site?: string; href?: string; run?: () => void };

function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const care: Item[] = [
    { label: "Find providers", Icon: Stethoscope, to: "/doctors" },
    ...(user ? [{ label: "My appointments", Icon: CalendarDays, to: "/appointments" }] : []),
    { label: "Pharmacy", Icon: Pill, to: "/pharmacy" },
    ...(user ? [{ label: "My orders", Icon: Package, to: "/orders" }] : []),
    ...(user ? [{ label: "Messages", Icon: MessageCircle, to: "/support" }] : []),
    { label: "Contact us", Icon: Phone, to: "/support/new" },
    { label: "Ambulance", Icon: Ambulance, to: "/ambulance" },
  ];
  const account: Item[] = user
    ? [
        { label: "My profile", Icon: User, to: "/account" },
        { label: "Notifications", Icon: Bell, to: "/notifications" },
        { label: "Log out", Icon: LogOut, run: () => void signOut() },
      ]
    : [
        { label: "Log in or sign up", Icon: LogIn, to: "/login" },
        { label: "Join as a provider", Icon: Stethoscope, site: "/providers/apply" },
        { label: "Sell on CareBora", Icon: Building2, site: "/vendors/apply" },
      ];
  const legal: Item[] = [{ label: "Privacy policy", Icon: ShieldCheck, site: "/privacy" }];

  function go(i: Item) {
    onClose();
    if (i.run) i.run();
    else if (i.to) router.navigate(i.to as never);
    else if (i.site) void openSite(i.site);
    else if (i.href) void Linking.openURL(i.href);
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: 320, maxWidth: "85%", backgroundColor: "#fff", paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18 }}>Menu</Text>
            <IconButton label="Close menu" onPress={onClose}><X size={22} color={t.textMuted} /></IconButton>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, gap: 18 }}>
            {[["Care", care], ["Account", account], ["Legal", legal]].map(([title, items]) => (
              <View key={title as string} style={{ gap: 2 }}>
                <Text style={{ color: t.textFaint, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.2, paddingHorizontal: 12, paddingBottom: 6 }}>
                  {(title as string).toUpperCase()}
                </Text>
                {(items as Item[]).map((i) => {
                  const active = !!i.to && (i.to === "/" ? pathname === "/" : pathname === i.to);
                  return (
                    <Pressable key={i.label} onPress={() => go(i)} accessibilityRole="button"
                      style={({ pressed }) => ({
                        flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, height: 46, borderRadius: 14,
                        backgroundColor: active ? "#F0FDFA" : pressed ? "#F8FAFC" : "transparent",
                      })}>
                      <i.Icon size={20} color={active ? "#0F766E" : t.textMuted} />
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: active ? "#0F766E" : t.textMuted }}>{i.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
        <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ flex: 1, backgroundColor: t.overlay }} />
      </View>
    </Modal>
  );
}

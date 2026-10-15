import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/ui/theme";

const ICON = {
  index: ["home", "home-outline"],
  doctors: ["medkit", "medkit-outline"],
  appointments: ["calendar", "calendar-outline"],
  account: ["person", "person-outline"],
} as const;

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: t.surface },
        headerTitleStyle: { fontWeight: "700", color: t.text },
        headerShadowVisible: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textFaint,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
        tabBarIcon: ({ focused, size }) => {
          const [on, off] = ICON[route.name as keyof typeof ICON] ?? ["ellipse", "ellipse-outline"];
          return <Ionicons name={focused ? on : off} size={size} color={focused ? t.primary : t.textFaint} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen name="doctors" options={{ title: "Doctors" }} />
      <Tabs.Screen name="appointments" options={{ title: "Appointments" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}

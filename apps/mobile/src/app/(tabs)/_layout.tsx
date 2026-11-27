import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "index" };

/** The website has no bottom tabs: navigation is the top bar and menu drawer, so these are plain pages. */
export default function TabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

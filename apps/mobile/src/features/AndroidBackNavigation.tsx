import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";
import { router, usePathname } from "expo-router";

/** Keep Android's system back action inside the app until the home screen. */
export function AndroidBackNavigation() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      // A notification or external link can open a screen without a previous page.
      if (pathname !== "/") {
        router.replace("/");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [pathname]);
  return null;
}

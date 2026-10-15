import { View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/ui/Button";
import { Empty } from "@/ui/parts";

/** Shown in place of a signed-in-only tab to a visitor who hasn't signed in. */
export function SignInPrompt({ title, hint, icon }: { title: string; hint: string; icon?: React.ComponentProps<typeof Empty>["icon"] }) {
  return (
    <View style={{ gap: 12 }}>
      <Empty icon={icon} title={title} hint={hint} />
      <Button title="Sign in" onPress={() => router.push("/login")} />
      <Button title="Create an account" variant="secondary" onPress={() => router.push("/register")} />
    </View>
  );
}

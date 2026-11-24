import { useState } from "react";
import { Linking, Platform } from "react-native";
import * as Updates from "expo-updates";
import { Card } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";
import { SITE_URL } from "@/lib/config";

/** Apply updates only on request so appointments and forms are never interrupted. */
export function AppUpdates() {
  const { isUpdatePending } = Updates.useUpdates();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function check() {
    if (busy) return;
    if (Platform.OS === "web" || !Updates.isEnabled) {
      await Linking.openURL(`${SITE_URL}/download`);
      return;
    }
    setBusy(true); setMessage("");
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setMessage("Update downloaded. Restart when you have finished your current work.");
      } else setMessage("You have the latest available update.");
    } catch { setMessage("Could not check for updates. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  async function restart() {
    setBusy(true);
    try { await Updates.reloadAsync(); }
    catch { setMessage("Could not restart. Close and reopen Care Bora to apply the update."); setBusy(false); }
  }
  return <Card>
    <Text variant="subheading">App updates</Text>
    <Text tone="muted">Get the latest changes for your account. Finish any appointment or unsaved work before restarting.</Text>
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    <Button title={isUpdatePending ? "Restart to update" : "Check for updates"} loading={busy} onPress={isUpdatePending ? restart : check} />
    <Button title="Download latest app version" variant="ghost" onPress={() => Linking.openURL(`${SITE_URL}/download`)} />
  </Card>;
}

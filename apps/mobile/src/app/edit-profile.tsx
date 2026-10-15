import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { PROVIDER_ROLES, composeFullName, splitFullName, type NameParts } from "@carebora/shared";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/useAsync";
import { Screen } from "@/ui/Screen";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { Avatar, Banner } from "@/ui/parts";
import { NameFields } from "@/ui/NameFields";
import { PhoneField } from "@/ui/PhoneField";

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState<NameParts>(() => splitFullName(user?.fullName ?? ""));
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const isProvider = PROVIDER_ROLES.includes(user.role);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.patchMe({ fullName: composeFullName(name), phone });
      await refreshUser();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    setPhotoBusy(true);
    try {
      // A camera photo is several MB; the server accepts 3 MB and a profile
      // picture never shows larger than a few hundred pixels. Shrink it first.
      const ctx = ImageManipulator.manipulate(res.assets[0].uri);
      ctx.resize({ width: 640 });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
      if (!out.base64) throw new Error("Couldn't read that photo.");
      await api.patchMe({ avatarUrl: `data:image/jpeg;base64,${out.base64}` });
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err, "Couldn't upload that photo."));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try { await api.patchMe({ avatarUrl: null }); await refreshUser(); }
    catch (err) { setError(errorMessage(err)); }
    finally { setPhotoBusy(false); }
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 10 }}>
        <Avatar name={user.fullName} uri={user.avatarUrl} size={96} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title={user.avatarUrl ? "Change photo" : "Add photo"} variant="secondary" size="sm" onPress={pickPhoto} loading={photoBusy} />
          {user.avatarUrl ? <Button title="Remove" variant="ghost" size="sm" onPress={removePhoto} disabled={photoBusy} /> : null}
        </View>
        {isProvider && <Text variant="caption" tone="faint" style={{ textAlign: "center" }}>Your photo and name are what patients see in the doctor directory.</Text>}
      </View>
      {error && <Banner tone="danger">{error}</Banner>}
      <NameFields value={name} onChange={setName} showTitle={isProvider} />
      <PhoneField label="Phone" value={phone} onChange={setPhone} />
      <Text variant="caption" tone="faint">To change the email you sign in with, message us from the Account tab. It&apos;s where every security code goes, so we verify it first.</Text>
      <Button title="Save changes" onPress={save} loading={busy} disabled={!name.firstName.trim() || !name.surname.trim()} />
    </Screen>
  );
}

"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Pencil, Check, X, Trash2 } from "lucide-react";
import type { PublicUser } from "@carebora/shared";
import { ApiError, PROVIDER_ROLES } from "@carebora/shared";
import { api } from "@/lib/api";
import { fileToDataUrl } from "@/lib/files";
import { PhoneField } from "@/components/PhoneField";
import { NameFields, composeFullName, splitFullName, type NameParts } from "@/components/NameFields";

/** Matches STORAGE_LIMITS.avatar on the server, so the UI rejects it first
 *  with a clearer message than a 400. */
const MAX_BYTES = 3_000_000;

/**
 * The account header on /profile — photo, name, phone — and the only place any
 * of the three could be changed, because until now none of them could be.
 *
 * For a care provider the photo is not decoration: it is what appears beside
 * their name in the public directory and on their profile, so they need to be
 * able to replace it without asking an admin.
 */
export default function IdentityCard({
  user, onSaved,
}: {
  user: PublicUser;
  onSaved: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<NameParts>(() => splitFullName(user.fullName));
  const [phone, setPhone] = useState(user.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isProvider = PROVIDER_ROLES.includes(user.role);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That image is over 3MB. Please choose a smaller one.");
      return;
    }
    setPhotoBusy(true);
    try {
      const avatarUrl = await fileToDataUrl(file);
      await api.patchMe({ avatarUrl });
      await onSaved();
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload that photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setError(null);
    try {
      await api.patchMe({ avatarUrl: null });
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove that photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fullName = composeFullName(name);
    if (fullName.trim().length < 2) { setError("Enter your name."); return; }
    setBusy(true);
    setError(null);
    try {
      await api.patchMe({ fullName, phone: phone.trim() });
      await onSaved();
      setEditing(false);
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="h-24 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600" />
      <div className="px-6 pb-6">
        <div className="-mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          {/* Photo, with the upload control on the image itself */}
          <div className="relative shrink-0">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-teal-100 to-emerald-100 text-3xl font-bold text-teal-700 shadow">
              {user.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover object-top" />
                : user.fullName.charAt(0)}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label={user.avatarUrl ? "Change profile photo" : "Add a profile photo"}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-teal-600 text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
            >
              {photoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-extrabold text-slate-900">{user.fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="truncate">{user.email}</span>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold capitalize text-teal-700">{user.role}</span>
              {user.phone && <span className="truncate">{user.phone}</span>}
            </div>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setName(splitFullName(user.fullName)); setPhone(user.phone ?? ""); setError(null); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit details
            </button>
          )}
        </div>

        {isProvider && (
          <p className="mt-3 text-xs text-slate-400">
            Your photo and name are what patients see in the provider directory.
          </p>
        )}

        {done && !editing && (
          <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="h-4 w-4" /> Saved
          </p>
        )}

        {user.avatarUrl && !photoBusy && (
          <button
            type="button"
            onClick={removePhoto}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" /> Remove photo
          </button>
        )}

        {editing && (
          <form onSubmit={save} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            <NameFields value={name} onChange={setName} />
            <PhoneField label="Phone" value={phone} onChange={setPhone} />
            <p className="text-xs text-slate-400">
              To change the email you sign in with, message us from the Contact page — it&apos;s
              the address every security code goes to, so we verify it before switching.
            </p>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Check className="h-4 w-4" /> Save changes</>}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </form>
        )}

        {error && !editing && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      </div>
    </div>
  );
}

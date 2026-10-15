"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PasswordField } from "@/components/PasswordField";

/**
 * "Delete account", at the bottom of the profile. Collapsed by default so it is
 * findable (both app stores require it) without inviting an accidental tap. Two
 * deliberate steps: the password, and typing DELETE.
 */
export default function DeleteAccountSection() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount({ confirm: "DELETE", ...(password ? { password } : {}) });
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
      <div className="flex items-center gap-2 font-bold text-rose-900"><Trash2 className="h-5 w-5" /> Delete account</div>
      {!open ? (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Permanently remove your account and personal details. This can&apos;t be undone.{" "}
            <Link href="/delete-account" className="font-semibold text-teal-700 hover:underline">What is deleted and what is kept</Link>.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Delete my account…
          </button>
        </>
      ) : (
        <form onSubmit={confirm} className="mt-4 max-w-sm space-y-3">
          <p className="flex items-start gap-2 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Upcoming appointments will be cancelled and you&apos;ll be signed out everywhere.
          </p>
          <PasswordField label="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Type DELETE to confirm</span>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoCapitalize="characters"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          {error && <p className="rounded-xl bg-white px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || phrase !== "DELETE"}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete permanently
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

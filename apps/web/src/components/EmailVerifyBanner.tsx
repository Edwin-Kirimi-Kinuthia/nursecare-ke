"use client";

import { useState } from "react";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

/** Slim bar prompting an unverified patient/provider to confirm their email. */
export default function EmailVerifyBanner() {
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user || user.emailVerified) return null;

  async function resend() {
    setBusy(true);
    setMessage(null);
    try {
      await api.resendVerification();
      setMessage("Code sent — check your inbox.");
      setOpen(true);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.verifyEmail({ code });
      await refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 text-center">
        {!open ? (
          <>
            <span>Please verify your email address.</span>
            <button onClick={resend} disabled={busy} className="font-semibold underline disabled:opacity-60">
              {busy ? "Sending…" : "Send verification code"}
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-28 rounded-lg border border-amber-300 bg-white px-2 py-1 text-center outline-none focus:border-amber-500"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="font-semibold underline disabled:opacity-60">
              Verify
            </button>
            <button type="button" onClick={resend} disabled={busy} className="underline disabled:opacity-60">
              Resend
            </button>
          </form>
        )}
        {message && <span>{message}</span>}
      </div>
    </div>
  );
}

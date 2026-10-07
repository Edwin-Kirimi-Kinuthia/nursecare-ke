"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PasswordField } from "@/components/PasswordField";

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) { setError("This link is missing its token — copy the full link from the email."); return; }
    setBusy(true);
    try {
      await api.setPassword({ token, password });
      await refresh();
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-blob absolute -left-20 top-10 h-72 w-72 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="animate-blob absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl delay-200" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Care Bora Kenya" width={150} height={124} className="h-28 w-auto" />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-slate-200/50 backdrop-blur">
          <h1 className="text-center text-2xl font-extrabold text-slate-900">Set your password</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Choose a new password to continue to CareBora.</p>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="new-password"
              showStrength
            />

            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <button
              type="submit" disabled={busy}
              className="w-full rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60"
            >
              {busy ? "Please wait…" : "Set password & sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

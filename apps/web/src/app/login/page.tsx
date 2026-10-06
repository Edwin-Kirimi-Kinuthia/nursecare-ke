"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  unsupported_provider: "That sign-in method isn't available.",
  invalid_state: "That sign-in link expired — please try again.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const oauthError = useSearchParams().get("oauthError");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await api.login({ email: form.email, password: form.password });
        await refresh();
        router.push("/providers");
        router.refresh();
      } else {
        await api.register({
          fullName: form.fullName, email: form.email, password: form.password,
          phone: form.phone || undefined, role: "patient",
        });
        await refresh();
        setStep("verify");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function finishToApp() {
    router.push("/providers");
    router.refresh();
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyEmail({ code });
      await refresh();
      finishToApp();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.resendVerification();
      setNotice("Code resent — check your inbox.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setMode("login");
    setForm((f) => ({ ...f, email: "alice@example.com", password: "Demo1234!" }));
    setError(null);
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
          {step === "verify" ? (
            <>
              <h1 className="text-center text-2xl font-extrabold text-slate-900">Verify your email</h1>
              <p className="mt-1 text-center text-sm text-slate-500">
                We sent a 6-digit code to <strong>{form.email}</strong>. Enter it below.
              </p>

              <form onSubmit={submitCode} className="mt-6 space-y-3.5">
                <Field
                  label="Verification code" value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" required
                />

                {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                {notice && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-700">{notice}</p>}

                <button
                  type="submit" disabled={busy || code.length !== 6}
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60"
                >
                  {busy ? "Please wait…" : "Verify"}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button onClick={resendCode} disabled={busy} className="font-semibold text-teal-700 hover:underline disabled:opacity-60">
                  Resend code
                </button>
                <button onClick={finishToApp} className="text-slate-500 hover:underline">
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-center text-2xl font-extrabold text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1 text-center text-sm text-slate-500">
                {mode === "login" ? "Log in to book care and manage appointments." : "Sign up as a patient to get started."}
              </p>

              {oauthError && (
                <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
                  {OAUTH_ERROR_MESSAGES[oauthError] ?? "Sign-in failed — please try again."}
                </p>
              )}

              <div className="mt-6 space-y-2">
                <a href={api.oauthStartUrl("google")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Continue with Google
                </a>
                <a href={api.oauthStartUrl("facebook")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Continue with Facebook
                </a>
              </div>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {mode === "register" && <Field label="Full name" value={form.fullName} onChange={(v) => set("fullName", v)} required />}
                <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
                <Field label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} required />
                {mode === "register" && <Field label="Phone (optional)" value={form.phone} onChange={(v) => set("phone", v)} placeholder="0712345678" />}

                {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

                <button
                  type="submit" disabled={busy}
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
                </button>
              </form>

              <button
                onClick={fillDemo}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <Sparkles className="h-4 w-4" /> Use demo account
              </button>

              <p className="mt-5 text-center text-sm text-slate-500">
                {mode === "login" ? "New to CareBora?" : "Already have an account?"}{" "}
                <button
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  {mode === "login" ? "Sign up" : "Log in"}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Are you a healthcare provider?{" "}
          <Link href="/providers/apply" className="font-semibold text-teal-700 hover:underline">Apply to join</Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type} value={value} required={required} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { ApiError } from "@carebora/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { PhoneField } from "@/components/PhoneField";
import { PasswordField } from "@/components/PasswordField";
import { NameFields, EMPTY_NAME, composeFullName, type NameParts } from "@/components/NameFields";

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
  const params = useSearchParams();
  const oauthError = params.get("oauthError");
  const idleSignedOut = params.get("reason") === "idle";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"form" | "verify" | "forgot" | "login-otp">("form");
  const [form, setForm] = useState({ email: "", password: "", phone: "" });
  const [name, setName] = useState<NameParts>(EMPTY_NAME);
  const [code, setCode] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
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
        setStep("login-otp");
      } else {
        const fullName = composeFullName(name);
        await api.register({
          fullName, email: form.email, password: form.password,
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

  async function submitLoginOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyLoginOtp({ email: form.email, code: loginCode });
      await refresh();
      finishToApp();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resendLoginCode() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { sent } = await api.resendLoginOtp({ email: form.email });
      setNotice(sent ? "Code resent — check your inbox." : "Couldn't resend — try logging in again.");
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

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.forgotPassword({ email: forgotEmail });
      setNotice("If an account exists for that email, we've sent a password reset link.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.05fr]">
      {/* Illustrated panel (wide screens only) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#647f6c] via-[#526f57] to-[#24472d] lg:flex lg:flex-col" aria-hidden>
        <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative mx-10 mt-14 flex-1 rounded-xl bg-[#e4eddc] p-8 shadow-xl shadow-black/10 xl:mx-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/illustrations/login-welcome.svg" alt="" className="h-full max-h-[22rem] w-full object-contain" />
        </div>
        <div className="relative p-10 xl:p-14">
          <p className="font-display text-3xl font-normal leading-tight tracking-tight text-white xl:text-4xl">Quality care, from wherever you are.</p>
          <ul className="mt-6 space-y-2.5 text-teal-50">
            <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-white" /> Licence-checked doctors and nurses</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-white" /> Private video consultations</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-white" /> Pay with M-Pesa, no cards</li>
          </ul>
        </div>
      </aside>
    <div className="relative flex items-center justify-center overflow-hidden px-4 py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="animate-blob absolute -left-24 top-10 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="animate-blob absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl delay-200" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Care Bora Kenya" width={150} height={124} className="h-24 w-auto drop-shadow-sm" />
        </div>

        <div className="rounded-xl border border-teal-200 bg-[#f9fbf5] p-8 shadow-xl shadow-teal-900/5 sm:p-10">
          {step === "login-otp" ? (
            <>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50">
                <ShieldCheck className="h-6 w-6 text-teal-600" />
              </div>
              <h1 className="text-center text-3xl font-medium tracking-tight text-slate-900">Check your email</h1>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-slate-500">
                For your security, we sent a 6-digit code to <strong className="text-slate-700">{form.email}</strong>.
              </p>

              <form onSubmit={submitLoginOtp} className="mt-7 space-y-4">
                <Field
                  label="Login code" value={loginCode}
                  onChange={(v) => setLoginCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" required
                />

                {error && <Alert tone="error">{error}</Alert>}
                {notice && <Alert tone="success">{notice}</Alert>}

                <button
                  type="submit" disabled={busy || loginCode.length !== 6}
                  className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Verifying…" : "Verify & log in"}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={resendLoginCode} disabled={busy} className="font-semibold text-teal-700 transition hover:text-teal-800 disabled:opacity-60">
                  Resend code
                </button>
                <button
                  onClick={() => { setStep("form"); setLoginCode(""); setError(null); setNotice(null); }}
                  className="flex items-center gap-1 text-slate-500 transition hover:text-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>
            </>
          ) : step === "forgot" ? (
            <>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50">
                <KeyRound className="h-6 w-6 text-teal-600" />
              </div>
              <h1 className="text-center text-3xl font-medium tracking-tight text-slate-900">Reset your password</h1>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-slate-500">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>

              <form onSubmit={requestReset} className="mt-7 space-y-4">
                <Field label="Email" type="email" value={forgotEmail} onChange={setForgotEmail} required />

                {error && <Alert tone="error">{error}</Alert>}
                {notice && <Alert tone="success">{notice}</Alert>}

                <button
                  type="submit" disabled={busy}
                  className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <button
                onClick={() => { setStep("form"); setError(null); setNotice(null); }}
                className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to log in
              </button>
            </>
          ) : step === "verify" ? (
            <>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50">
                <ShieldCheck className="h-6 w-6 text-teal-600" />
              </div>
              <h1 className="text-center text-3xl font-medium tracking-tight text-slate-900">Verify your email</h1>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-slate-500">
                We sent a 6-digit code to <strong className="text-slate-700">{form.email}</strong>. Enter it below.
              </p>

              <form onSubmit={submitCode} className="mt-7 space-y-4">
                <Field
                  label="Verification code" value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" required
                />

                {error && <Alert tone="error">{error}</Alert>}
                {notice && <Alert tone="success">{notice}</Alert>}

                <button
                  type="submit" disabled={busy || code.length !== 6}
                  className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Please wait…" : "Verify"}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={resendCode} disabled={busy} className="font-semibold text-teal-700 transition hover:text-teal-800 disabled:opacity-60">
                  Resend code
                </button>
                <button onClick={finishToApp} className="text-slate-400 transition hover:text-slate-600">
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-center text-3xl font-medium tracking-tight text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-center text-sm leading-relaxed text-slate-500">
                {mode === "login" ? "Log in to book care and manage your appointments." : "Sign up as a patient to get started."}
              </p>

              {idleSignedOut && (
                <div className="mt-5">
                  <Alert tone="success">You were signed out after 20 minutes of inactivity, to keep your health information safe. Please log in again.</Alert>
                </div>
              )}

              {oauthError && (
                <div className="mt-5">
                  <Alert tone="error">{OAUTH_ERROR_MESSAGES[oauthError] ?? "Sign-in failed — please try again."}</Alert>
                </div>
              )}

              <a
                href={api.oauthStartUrl("google")}
                className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-[#1a73e8] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-[#1765cc] hover:shadow-lg hover:shadow-blue-600/30"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white">
                  <GoogleIcon className="h-3.5 w-3.5" />
                </span>
                Continue with Google
              </a>

              <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                <div className="h-px flex-1 bg-slate-200" /> or continue with email <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <NameFields
                    value={name} onChange={setName}
                    inputClassName="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                )}
                <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
                <PasswordField
                  label="Password"
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  required
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  labelClassName="text-sm font-medium text-slate-700"
                  inputClassName="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  // Only while choosing a password — nagging someone about
                  // strength as they sign in to an existing account is noise.
                  showStrength={mode === "register"}
                >
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setStep("forgot"); setForgotEmail(form.email); setError(null); setNotice(null); }}
                      className="mt-1.5 text-xs font-semibold text-teal-700 transition hover:text-teal-800"
                    >
                      Forgot password?
                    </button>
                  )}
                </PasswordField>
                {mode === "register" && (
                  <PhoneField label="Phone (optional)" value={form.phone} onChange={(v) => set("phone", v)} />
                )}

                {error && <Alert tone="error">{error}</Alert>}

                <button
                  type="submit" disabled={busy}
                  className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                {mode === "login" ? "New to CareBora?" : "Already have an account?"}{" "}
                <button
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                  className="font-semibold text-teal-700 transition hover:text-teal-800"
                >
                  {mode === "login" ? "Sign up" : "Log in"}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Are you a healthcare provider?{" "}
          <Link href="/providers/apply" className="font-semibold text-teal-700 transition hover:text-teal-800">Apply to join</Link>
        </p>
      </div>
    </div>
    </div>
  );
}

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const cls = tone === "error" ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-700";
  return <p className={`rounded-xl px-3.5 py-2.5 text-sm ${cls}`}>{children}</p>;
}

function Field({
  label, value, onChange, type = "text", required, placeholder, revealable,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; revealable?: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  const resolvedType = revealable ? (reveal ? "text" : "password") : type;
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1.5">
        <input
          type={resolvedType} value={value} required={required} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 ${revealable ? "pr-11" : ""}`}
        />
        {revealable && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 transition hover:text-slate-600"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.5404-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.0359-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.9641 10.71c-.18-.5404-.2822-1.1177-.2822-1.71s.1023-1.1696.2822-1.71V4.9582H.9574C.3477 6.1731 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" />
    </svg>
  );
}

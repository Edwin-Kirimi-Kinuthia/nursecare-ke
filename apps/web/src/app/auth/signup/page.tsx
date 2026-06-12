"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "patient" | "provider";

export default function SignupPage() {
  const [role, setRole] = useState<Role>("patient");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    specialty: "", license: "", experience: "", location: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "provider" && step === 1) { setStep(2); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));

    if (role === "patient") {
      localStorage.setItem("nc_user_auth", "true");
      localStorage.setItem("nc_user_profile", JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        location: "",
        dob: "",
        blood: "",
        allergies: "",
        conditions: "",
        medications: "",
        ec_name: "",
        ec_relationship: "",
        ec_phone: "",
      }));
      setLoading(false);
      setDone(true);
      return;
    }

    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="pt-16 min-h-screen bg-gradient-to-br from-blue-950 to-blue-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            {role === "provider" ? "Application Submitted!" : "Account Created!"}
          </h1>
          <p className="text-slate-500 mb-8">
            {role === "provider"
              ? "Our team will review your credentials and get back to you within 24–48 hours. You'll receive your Verified badge upon approval."
              : `Welcome to NurseCare Kenya, ${form.name.split(" ")[0]}! You can now browse and book verified healthcare professionals.`}
          </p>
          <Link href={role === "provider" ? "/" : "/providers"} className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-colors">
            {role === "provider" ? "Go to Homepage" : "Find a Nurse"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-gradient-to-br from-blue-950 to-blue-900 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="text-slate-500 text-sm mt-1">Join thousands of Kenyans on NurseCare</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-8 p-1.5 bg-slate-100 rounded-2xl">
            {([["patient", "I need care", "👤"], ["provider", "I provide care", "🩺"]] as const).map(([r, label, emoji]) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setStep(1); }}
                className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${role === r ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Provider step indicator */}
          {role === "provider" && (
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= s ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>{s}</div>
                  <div className="text-xs text-slate-400">{s === 1 ? "Basic Info" : "Professional Details"}</div>
                  {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-blue-600" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: everyone + patient full form */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Full Name</label>
                    <input type="text" required placeholder="Jane Wanjiku" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Email</label>
                    <input type="email" required placeholder="jane@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Phone</label>
                    <input type="tel" required placeholder="+254 7XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Password</label>
                    <input type="password" required placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                  {loading ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating account…</>
                  ) : role === "provider" ? "Continue →" : "Create Account"}
                </button>
              </>
            )}

            {/* Step 2: provider professional details */}
            {step === 2 && role === "provider" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Specialty / Role</label>
                    <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                      <option value="">Select your specialty…</option>
                      {["Home Care Specialist", "Registered Nurse (KRN)", "Emergency Nurse / EMT", "Physiotherapist", "Pediatric Nurse", "Midwife", "Geriatric Nurse", "Other"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">License / Registration No.</label>
                    <input type="text" required placeholder="e.g. KRN/12345" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Years of Experience</label>
                    <input type="number" required min="1" max="40" placeholder="e.g. 5" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Base Location (Nairobi area)</label>
                    <input type="text" required placeholder="e.g. Westlands, Nairobi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
                  <strong>Verification:</strong> Our admin team will verify your license, identity, and qualifications within 24–48 hours. You&apos;ll receive a Verified badge upon approval.
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="flex-shrink-0 px-5 py-4 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">← Back</button>
                  <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Submitting…</> : "Submit Application"}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

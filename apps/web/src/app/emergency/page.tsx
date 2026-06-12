"use client";

import { useState } from "react";
import Link from "next/link";

const emergencyTypes = [
  { id: "cardiac", label: "Cardiac Emergency", desc: "Chest pain, heart attack, palpitations" },
  { id: "breathing", label: "Breathing Difficulty", desc: "Severe asthma, choking, respiratory distress" },
  { id: "accident", label: "Accident / Injury", desc: "Falls, cuts, fractures, trauma" },
  { id: "stroke", label: "Stroke Symptoms", desc: "Facial drooping, arm weakness, speech difficulty" },
  { id: "unconscious", label: "Unconscious Person", desc: "Person unresponsive or collapsed" },
  { id: "other", label: "Other Emergency", desc: "Any other urgent medical situation" },
];

export default function EmergencyPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    type: "",
    name: "",
    phone: "",
    location: "",
    details: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pt-16 min-h-screen bg-red-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Help Is On the Way</h1>
          <p className="text-slate-600 mb-2">Your emergency request has been received.</p>
          <p className="text-slate-600 mb-8">A verified emergency nurse has been dispatched to <strong>{form.location}</strong>.</p>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Peter Kamau is on his way</p>
                <p className="text-slate-500 text-sm">Emergency Response Specialist</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Estimated arrival</span>
                <span className="font-bold text-slate-900">~25 minutes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Emergency ref</span>
                <span className="font-bold text-slate-900 font-mono">EMG-{Date.now().toString().slice(-6)}</span>
              </div>
            </div>
          </div>

          <a href="tel:+254700911911" className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl text-lg transition-colors mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Emergency Line
          </a>
          <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm">Return to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      {/* Urgent banner */}
      <div className="bg-red-600 py-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <p className="text-white font-semibold text-sm">Emergency Response Team is ONLINE — Average response: 25 minutes</p>
          </div>
          <a href="tel:+254700911911" className="flex-shrink-0 bg-white text-red-600 text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Call Now
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 emergency-pulse">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Request Emergency Help</h1>
          <p className="text-slate-500">Fill in the form below and a certified emergency nurse will be dispatched immediately.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${step >= s ? "bg-red-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {step > s ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-red-600" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-6">What type of emergency?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {emergencyTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setForm({ ...form, type: type.id })}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      form.type === type.id
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-red-300 hover:bg-red-50/50"
                    }`}
                  >
                    <p className="font-bold text-slate-900 text-sm">{type.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{type.desc}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => form.type && setStep(2)}
                disabled={!form.type}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="font-bold text-slate-900 text-xl mb-6">Your location &amp; contact</h2>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+254 7XX XXX XXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Exact Location / Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Westlands, Rose Avenue, Gate 5 — Blue House"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Brief Description <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    rows={3}
                    placeholder="Describe the situation briefly…"
                    value={form.details}
                    onChange={(e) => setForm({ ...form, details: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-shrink-0 px-5 py-4 border border-slate-200 rounded-2xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
                  ← Back
                </button>
                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl transition-colors emergency-pulse">
                  🚨 Dispatch Emergency Nurse Now
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Alternative: call */}
        <div className="mt-6 bg-slate-900 rounded-2xl p-6 text-center">
          <p className="text-slate-400 text-sm mb-3">Prefer to call directly?</p>
          <a href="tel:+254700911911" className="text-white font-bold text-2xl hover:text-red-400 transition-colors">
            +254 700 911 911
          </a>
          <p className="text-slate-500 text-xs mt-2">24/7 · Answered in under 30 seconds</p>
        </div>
      </div>
    </div>
  );
}

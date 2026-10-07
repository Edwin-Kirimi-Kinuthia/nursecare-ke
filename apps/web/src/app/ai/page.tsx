"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, AlertTriangle, AlertCircle, CheckCircle2, Loader2, ArrowRight, ShoppingBag } from "lucide-react";
import { api, kes } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import type { SymptomCheckResult } from "@carebora/api-client";

const URGENCY_META: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  routine:   { label: "Routine",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200",   Icon: CheckCircle2 },
  urgent:    { label: "Urgent",    cls: "bg-amber-50 text-amber-700 border-amber-200",          Icon: AlertCircle },
  emergency: { label: "Emergency", cls: "bg-rose-50 text-rose-700 border-rose-200",             Icon: AlertTriangle },
};

export default function AiPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && !user) {
    router.replace("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.symptomCheck({
        symptoms: symptoms.trim(),
        patientAge: age ? parseInt(age, 10) : undefined,
      });
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const urgencyMeta = result ? (URGENCY_META[result.urgency] ?? URGENCY_META.routine) : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        className="mb-8"
        eyebrow="Symptom checker"
        Icon={Brain}
        tone="violet"
        title="AI health check"
        lede="Describe your symptoms and get instant triage guidance. This is not a diagnosis — it tells you how urgently to seek care and who to see."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Describe your symptoms <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            placeholder="e.g. I have had a persistent headache for 3 days, with some fever and neck stiffness…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
            required
            minLength={5}
            maxLength={1000}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{symptoms.length}/1000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Age (optional)</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 32"
              min={0}
              max={150}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !symptoms.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Analysing symptoms…" : "Check symptoms"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {result && urgencyMeta && (
        <div className="mt-8 space-y-4">
          <div className={`flex items-center gap-3 rounded-xl border p-4 ${urgencyMeta.cls}`}>
            <urgencyMeta.Icon className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold">{urgencyMeta.label} concern</p>
              {result.seekEmergencyCare && (
                <p className="text-sm font-medium">Please seek emergency care immediately.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended specialist</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{result.recommendedSpecialty}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Advice</p>
              <p className="mt-0.5 text-sm text-slate-700">{result.advice}</p>
            </div>
          </div>

          {result.pharmacySuggestions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                <ShoppingBag className="h-4 w-4" /> Available at our pharmacy
              </div>
              <p className="mt-0.5 text-xs text-slate-400">Over-the-counter options you can order now — not a substitute for professional advice.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {result.pharmacySuggestions.map((d) => (
                  <Link key={d.id} href="/pharmacy" className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-teal-300 hover:bg-teal-50/40">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {d.imageUrl && <img src={d.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{d.name}</div>
                      <div className="text-xs font-bold text-teal-700">{kes(d.priceKes)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push(`/providers`)}
            className="flex w-full items-center justify-between rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-500/30 transition hover:bg-teal-700"
          >
            <span>Find {result.recommendedSpecialty} providers</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <strong>Disclaimer:</strong> {result.disclaimer}
          </p>
        </div>
      )}
    </main>
  );
}

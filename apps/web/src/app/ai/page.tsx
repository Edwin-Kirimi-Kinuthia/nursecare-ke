"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain, AlertTriangle, AlertCircle, CheckCircle2, Home, Loader2, ArrowRight, ShoppingBag, Stethoscope,
  Pill, Search, ShieldAlert, ListChecks, HelpCircle, ClipboardList, FlaskConical, Siren, Info,
} from "lucide-react";
import { api, kes } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import type { ClinicalQueryResult, SymptomCheckResult } from "@carebora/api-client";

const CLINICIAN_ROLES = ["doctor", "nurse", "physio", "admin"];

const URGENCY = {
  self_care: { label: "You can likely manage this at home", cls: "from-emerald-50 to-teal-50 text-emerald-800 ring-emerald-200", Icon: Home },
  routine: { label: "See a clinician in the next few days", cls: "from-sky-50 to-cyan-50 text-sky-800 ring-sky-200", Icon: CheckCircle2 },
  urgent: { label: "See a clinician today", cls: "from-amber-50 to-orange-50 text-amber-800 ring-amber-200", Icon: AlertCircle },
  emergency: { label: "Get emergency care now", cls: "from-rose-100 to-red-50 text-rose-800 ring-rose-300", Icon: AlertTriangle },
} as const;

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20";

// Visible to everyone (and to search engines); signing in is only asked for when they submit.
export default function AiPage() {
  const { user } = useAuth();
  const isClinician = !!user && CLINICIAN_ROLES.includes(user.role);
  const [tab, setTab] = useState<"symptoms" | "clinical">("symptoms");


  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        className="mb-6"
        eyebrow={tab === "clinical" ? "Clinical assistant" : "Symptom checker"}
        Icon={tab === "clinical" ? Stethoscope : Brain}
        tone="violet"
        title={tab === "clinical" ? "Clinical reference" : "AI health check"}
        lede={tab === "clinical"
          ? "Drug doses, routes and durations, differential diagnoses and quick clinical answers, aligned with Kenyan guidelines."
          : "Describe how you feel. You'll get likely causes, what you can do now, safe over-the-counter options and the warning signs to watch for."}
      />

      {isClinician && (
        <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
          {([["symptoms", "Symptom checker"], ["clinical", "Clinical assistant"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "clinical" && isClinician ? <ClinicalAssistant /> : <SymptomChecker />}
    </main>
  );
}

/* ── Patients ─────────────────────────────────────────────────────────────── */
function SymptomChecker() {
  const router = useRouter();
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"" | "female" | "male">("");
  const [pregnant, setPregnant] = useState(false);
  const [duration, setDuration] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [meds, setMeds] = useState("");
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (symptoms.trim().length < 5) return;
    if (!user) { router.push("/login"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await api.symptomCheck({
        symptoms: symptoms.trim(),
        patientAge: age ? parseInt(age, 10) : undefined,
        sex: sex || undefined,
        pregnant: sex === "female" && pregnant ? true : undefined,
        duration: duration.trim() || undefined,
        allergies: list(allergies).length ? list(allergies) : undefined,
        conditions: list(conditions).length ? list(conditions) : undefined,
        currentMedicines: list(meds).length ? list(meds) : undefined,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  const u = result ? URGENCY[result.urgency] ?? URGENCY.routine : null;

  return (
    <>
      <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Describe your symptoms <span className="text-rose-500">*</span></label>
          <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} maxLength={1500} required minLength={5}
            placeholder="e.g. I've had a headache and fever for 3 days, with chills at night and body aches…" className={inputCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Age</label>
            <input type="number" min={0} max={150} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 32" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value as "" | "female" | "male")} className={inputCls}>
              <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">For how long?</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 3 days" className={inputCls} />
          </div>
        </div>
        {sex === "female" && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600" /> I am pregnant
          </label>
        )}
        <button type="button" onClick={() => setMore((m) => !m)} className="text-sm font-semibold text-violet-700 hover:underline">
          {more ? "Hide" : "Add"} allergies, conditions and medicines (better, safer advice)
        </button>
        {more && (
          <div className="grid gap-4 sm:grid-cols-3">
            <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Allergies, e.g. penicillin" className={inputCls} />
            <input value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Conditions, e.g. asthma" className={inputCls} />
            <input value={meds} onChange={(e) => setMeds(e.target.value)} placeholder="Medicines you take" className={inputCls} />
          </div>
        )}
        <button type="submit" disabled={loading || symptoms.trim().length < 5}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-violet-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Thinking it through…" : user ? "Check my symptoms" : "Log in to check my symptoms"}
        </button>
      </form>

      {error && <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {result && u && (
        <div className="mt-8 space-y-4">
          <div className={`flex items-start gap-3 rounded-2xl bg-gradient-to-r p-5 ring-1 ${u.cls}`}>
            <u.Icon className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <p className="text-lg font-bold">{u.label}</p>
              <p className="mt-1 text-sm opacity-90">{result.advice}</p>
              {result.seekEmergencyCare && (
                <a href="tel:999" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"><Siren className="h-4 w-4" /> Call 999 / 112</a>
              )}
            </div>
          </div>

          {result.possibleCauses.length > 0 && (
            <Card title="What it might be" Icon={Search} tone="text-violet-600">
              <ul className="space-y-3">
                {result.possibleCauses.map((c) => (
                  <li key={c.name} className="flex gap-3">
                    <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.likelihood === "more likely" ? "bg-violet-100 text-violet-700" : c.likelihood === "possible" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{c.likelihood}</span>
                    <div><p className="font-semibold text-slate-900">{c.name}</p><p className="text-sm text-slate-600">{c.why}</p></div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">Only a clinician can diagnose you, often with a test.</p>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {result.selfCare.length > 0 && (
              <Card title="What you can do now" Icon={ListChecks} tone="text-teal-600">
                <Bullets items={result.selfCare} dot="bg-teal-500" />
              </Card>
            )}
            <Card title="Get help urgently if" Icon={ShieldAlert} tone="text-rose-600">
              <Bullets items={result.redFlags} dot="bg-rose-500" />
            </Card>
          </div>

          {result.otcOptions.length > 0 && (
            <Card title="Over-the-counter options" Icon={Pill} tone="text-orange-600">
              <ul className="space-y-3">
                {result.otcOptions.map((o) => (
                  <li key={o.name} className="rounded-xl bg-orange-50/60 p-3">
                    <p className="font-semibold text-slate-900">{o.name}</p>
                    <p className="text-sm text-slate-700">{o.howToUse}</p>
                    {o.caution && <p className="mt-1 text-xs text-orange-700">⚠ {o.caution}</p>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">Always read the pack and ask a pharmacist if you are pregnant, take other medicines or have a long-term condition.</p>
            </Card>
          )}

          {result.pharmacySuggestions.length > 0 && (
            <Card title="Available at our pharmacy" Icon={ShoppingBag} tone="text-teal-700">
              <div className="grid grid-cols-2 gap-3">
                {result.pharmacySuggestions.map((d) => (
                  <Link key={d.id} href="/pharmacy" className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 transition hover:border-teal-300 hover:bg-teal-50/40">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {d.imageUrl && <img src={d.imageUrl} alt="" className="h-full w-full object-contain" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">{d.name}</div>
                      <div className="text-xs font-bold text-teal-700">{kes(d.priceKes)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <button onClick={() => router.push(`/providers`)}
            className="flex w-full items-center justify-between rounded-2xl bg-teal-600 px-5 py-4 text-left text-sm font-semibold text-white shadow-md shadow-teal-500/30 transition hover:bg-teal-700">
            <span>{result.whenToSeeDoctor}<span className="block text-xs font-normal text-teal-100">Find a {result.recommendedSpecialty} provider</span></span>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </button>

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500"><strong>Important:</strong> {result.disclaimer}</p>
        </div>
      )}
    </>
  );
}

/* ── Clinicians ───────────────────────────────────────────────────────────── */
const MODES = [
  { id: "drug", label: "Drug reference", Icon: Pill, placeholder: "e.g. amoxicillin, artemether-lumefantrine, ceftriaxone", hint: "Doses by population, routes, frequency, duration, max dose, cautions." },
  { id: "differential", label: "Symptoms → diagnoses", Icon: ClipboardList, placeholder: "e.g. 4-year-old, fever 3 days, cough, fast breathing, poor feeding", hint: "Ranked differentials, red flags, work-up and first-line management." },
  { id: "question", label: "Ask anything", Icon: HelpCircle, placeholder: "e.g. switching from IV to oral antibiotics in pneumonia?", hint: "Any clinical question, answered concisely." },
] as const;

function ClinicalAssistant() {
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("drug");
  const [query, setQuery] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [pregnant, setPregnant] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClinicalQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const m = MODES.find((x) => x.id === mode)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await api.clinicalQuery({
        mode, query: query.trim(),
        patientAge: age ? parseInt(age, 10) : undefined,
        weightKg: weight ? parseFloat(weight) : undefined,
        pregnant: pregnant || undefined,
        conditions: list(notes).length ? list(notes) : undefined,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {MODES.map((x) => (
          <button key={x.id} onClick={() => { setMode(x.id); setResult(null); }} aria-pressed={mode === x.id}
            className={`flex items-center gap-2 rounded-2xl p-3 text-left text-sm font-semibold ring-1 transition ${mode === x.id ? "bg-violet-50 text-violet-800 ring-violet-300" : "bg-white text-slate-600 ring-slate-200 hover:ring-violet-200"}`}>
            <x.Icon className="h-4 w-4 shrink-0" /> {x.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
        <div>
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={mode === "drug" ? 2 : 3} maxLength={1500} placeholder={m.placeholder} className={inputCls} />
          <p className="mt-1 text-xs text-slate-400">{m.hint}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age (years)" className={inputCls} />
          <input type="number" min={0} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg)" className={inputCls} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comorbidities, e.g. CKD" className={`${inputCls} sm:col-span-2`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-violet-600" /> Pregnant
        </label>
        <button type="submit" disabled={loading || query.trim().length < 2}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:bg-violet-700 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <m.Icon className="h-4 w-4" />}
          {loading ? "Looking it up…" : "Get reference"}
        </button>
      </form>

      {error && <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {result && <ClinicalResult r={result} />}
    </>
  );
}

function ClinicalResult({ r }: { r: ClinicalQueryResult }) {
  return (
    <div className="mt-8 space-y-4">
      {r.source !== "claude" && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {r.source === "basic" ? "Answered by the basic AI model. Double-check every dose before use." : "The clinical assistant is not configured yet."}
        </p>
      )}

      {r.drug && (
        <>
          <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 ring-1 ring-violet-100">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">{r.drug.drugClass}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{r.drug.drug}</h2>
            {r.drug.indications.length > 0 && <p className="mt-2 text-sm text-slate-600">{r.drug.indications.join(" · ")}</p>}
          </div>
          {r.drug.dosing.length > 0 && (
            <Card title="Dosing" Icon={Pill} tone="text-violet-600">
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs uppercase text-slate-400">
                    <tr><th className="px-2 py-2">Who</th><th className="px-2 py-2">Dose</th><th className="px-2 py-2">Route</th><th className="px-2 py-2">How often</th><th className="px-2 py-2">Duration</th><th className="px-2 py-2">Max</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.drug.dosing.map((d, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-2 py-2.5 font-semibold text-slate-800">{d.population}</td>
                        <td className="px-2 py-2.5 text-slate-700">{d.dose}</td>
                        <td className="px-2 py-2.5"><span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{d.route}</span></td>
                        <td className="px-2 py-2.5 text-slate-700">{d.frequency}</td>
                        <td className="px-2 py-2.5 text-slate-700">{d.duration}</td>
                        <td className="px-2 py-2.5 text-slate-500">{d.maxDose ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Contraindications" items={r.drug.contraindications} tone="text-rose-600" dot="bg-rose-500" Icon={ShieldAlert} />
            <ListCard title="Key interactions" items={r.drug.interactions} tone="text-amber-600" dot="bg-amber-500" Icon={AlertCircle} />
            <ListCard title="Renal / hepatic adjustment" items={r.drug.adjustments} tone="text-sky-600" dot="bg-sky-500" Icon={FlaskConical} />
            <ListCard title="Side effects" items={r.drug.sideEffects} tone="text-slate-600" dot="bg-slate-400" Icon={Info} />
            <ListCard title="Monitoring" items={r.drug.monitoring} tone="text-teal-600" dot="bg-teal-500" Icon={ListChecks} />
            <ListCard title="Counselling" items={r.drug.counselling} tone="text-violet-600" dot="bg-violet-500" Icon={HelpCircle} />
          </div>
          {r.drug.pregnancyLactation && <Card title="Pregnancy & breastfeeding" Icon={Info} tone="text-pink-600"><p className="text-sm text-slate-700">{r.drug.pregnancyLactation}</p></Card>}
        </>
      )}

      {r.differential && (
        <>
          {r.differential.summary && <p className="rounded-2xl bg-violet-50 p-4 text-sm font-medium text-violet-900 ring-1 ring-violet-100">{r.differential.summary}</p>}
          <Card title="Differential diagnosis" Icon={ClipboardList} tone="text-violet-600">
            <ul className="space-y-3">
              {r.differential.differentials.map((d) => (
                <li key={d.condition} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{d.condition}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${d.likelihood === "must not miss" ? "bg-rose-100 text-rose-700" : d.likelihood === "most likely" ? "bg-violet-100 text-violet-700" : d.likelihood === "likely" ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"}`}>{d.likelihood}</span>
                  </div>
                  {d.supporting && <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-emerald-700">For:</span> {d.supporting}</p>}
                  {d.against && <p className="text-sm text-slate-600"><span className="font-semibold text-slate-500">Against:</span> {d.against}</p>}
                </li>
              ))}
            </ul>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Red flags" items={r.differential.redFlags} tone="text-rose-600" dot="bg-rose-500" Icon={ShieldAlert} />
            <ListCard title="Ask about" items={r.differential.history} tone="text-sky-600" dot="bg-sky-500" Icon={HelpCircle} />
            <ListCard title="Examine for" items={r.differential.examination} tone="text-teal-600" dot="bg-teal-500" Icon={Stethoscope} />
            <ListCard title="Investigations" items={r.differential.investigations} tone="text-amber-600" dot="bg-amber-500" Icon={FlaskConical} />
          </div>
          <ListCard title="Initial management" items={r.differential.initialManagement} tone="text-violet-600" dot="bg-violet-500" Icon={Pill} />
          {r.differential.referWhen && <Card title="Refer or admit when" Icon={Siren} tone="text-rose-600"><p className="text-sm text-slate-700">{r.differential.referWhen}</p></Card>}
        </>
      )}

      {r.answer && <Card title="Answer" Icon={Brain} tone="text-violet-600"><p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.answer}</p></Card>}

      {r.pharmacySuggestions.length > 0 && (
        <Card title="In stock at Care Bora pharmacies" Icon={ShoppingBag} tone="text-teal-700">
          <div className="flex flex-wrap gap-2">
            {r.pharmacySuggestions.map((d) => <span key={d.id} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">{d.name} · {kes(d.priceKes)}</span>)}
          </div>
        </Card>
      )}

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500"><strong>For clinicians:</strong> {r.disclaimer}</p>
    </div>
  );
}

/* ── Bits ─────────────────────────────────────────────────────────────────── */
function Card({ title, Icon, tone, children }: { title: string; Icon: typeof Brain; tone: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-bold ${tone}`}><Icon className="h-4 w-4" /> {title}</h3>
      {children}
    </section>
  );
}
function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => <li key={t} className="flex gap-2.5 text-sm text-slate-700"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />{t}</li>)}
    </ul>
  );
}
function ListCard({ title, items, tone, dot, Icon }: { title: string; items: string[]; tone: string; dot: string; Icon: typeof Brain }) {
  if (!items.length) return null;
  return <Card title={title} Icon={Icon} tone={tone}><Bullets items={items} dot={dot} /></Card>;
}

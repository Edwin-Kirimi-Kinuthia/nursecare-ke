import { db } from "@carebora/db";

/**
 * AI assistance for CareBora.
 *
 * Uses a free Hugging Face Inference model by default (HF_API_TOKEN), falling
 * back to Anthropic (ANTHROPIC_API_KEY) if configured, and finally to safe
 * canned responses so the feature always works. All drug suggestions are
 * cross-referenced against the CareBora pharmacy so we only ever recommend
 * items the patient can actually buy here.
 */

const PATIENT_SYSTEM = `You are Care Bora's symptom guide for people in Kenya. You help a patient understand what their symptoms might mean and what to do next. You are not a doctor and never state a diagnosis as certain: you describe possible causes and their likelihood.

Write in plain, warm, everyday English a non-medical adult understands. Be specific and practical — real self-care steps, real warning signs — not generic advice. Consider conditions common in Kenya (malaria, typhoid, UTIs, gastroenteritis, pneumonia, TB, hypertension, diabetes) where the symptoms fit.

Only suggest over-the-counter medicines a pharmacy in Kenya sells without a prescription, with label-standard adult doses (or "follow the pack for children" for under-12s). Never suggest antibiotics, antimalarials or other prescription medicines; say a clinician must decide on those. If anything suggests an emergency (chest pain, difficulty breathing, signs of stroke, heavy bleeding, confusion, a very sick child, severe dehydration, pregnancy bleeding), urgency is "emergency" and the first instruction is to get emergency care now.`;

const CLINICIAN_SYSTEM = `You are Care Bora's clinical reference assistant for licensed clinicians in Kenya (doctors, clinical officers, nurses, physiotherapists). Answer like a concise, accurate drug formulary and clinical handbook: specific doses with units, routes, frequencies, durations and maximum doses; weight-based paediatric dosing where relevant; renal and hepatic adjustments; contraindications and important interactions. Prefer first-line options in the Kenya National Clinical Guidelines and the Kenya Essential Medicines List, and mention local realities (e.g. malaria testing before treatment, TB and HIV considerations, antimicrobial stewardship). Be precise; if something is uncertain or varies by guideline, say so rather than inventing a number. Never pad.`;

const DISCLAIMER = "General guidance only, not a diagnosis. A licensed clinician should assess you, and you should get emergency care straight away if you have any of the warning signs.";
const CLINICAL_DISCLAIMER = "AI-generated reference for clinicians. Verify doses against the current Kenya National Clinical Guidelines, the product label or a formulary, and apply clinical judgement.";

export interface PharmacySuggestion {
  id: string;
  name: string;
  category: string;
  priceKes: number;
  imageUrl: string | null;
  requiresPrescription: boolean;
}

type Urgency = "self_care" | "routine" | "urgent" | "emergency";
export interface SymptomCheckResult {
  urgency: Urgency;
  recommendedSpecialty: string;
  advice: string;
  seekEmergencyCare: boolean;
  possibleCauses: { name: string; likelihood: "more likely" | "possible" | "less likely"; why: string }[];
  selfCare: string[];
  otcOptions: { name: string; howToUse: string; caution?: string }[];
  redFlags: string[];
  whenToSeeDoctor: string;
  disclaimer: string;
  pharmacySuggestions: PharmacySuggestion[];
}

export interface ProviderMatchResult {
  recommendedSpecialty: string;
  reason: string;
  alternatives: string[];
}

export interface FactCheckResult {
  answer: string;
  disclaimer: string;
  pharmacySuggestions: PharmacySuggestion[];
}

export interface PatientContext {
  patientAge?: number;
  sex?: "female" | "male";
  pregnant?: boolean;
  duration?: string;
  allergies?: string[];
  conditions?: string[];
  currentMedicines?: string[];
  weightKg?: number;
}

function describeContext(c: PatientContext): string {
  const parts = [
    c.patientAge != null && `Age: ${c.patientAge}`,
    c.sex && `Sex: ${c.sex}`,
    c.pregnant && "Pregnant: yes",
    c.weightKg && `Weight: ${c.weightKg} kg`,
    c.duration && `Duration: ${c.duration}`,
    c.allergies?.length && `Allergies: ${c.allergies.join(", ")}`,
    c.conditions?.length && `Long-term conditions: ${c.conditions.join(", ")}`,
    c.currentMedicines?.length && `Current medicines: ${c.currentMedicines.join(", ")}`,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : "No further details given.";
}

// JSON Schemas for structured output (Claude enforces them; the fallback model is asked to follow them).
const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });

const SYMPTOM_SCHEMA = obj({
  urgency: { type: "string", enum: ["self_care", "routine", "urgent", "emergency"] },
  summary: str,
  possibleCauses: { type: "array", items: obj({ name: str, likelihood: { type: "string", enum: ["more likely", "possible", "less likely"] }, why: str }) },
  selfCare: strArr,
  otcOptions: { type: "array", items: obj({ name: str, howToUse: str, caution: str }) },
  redFlags: strArr,
  whenToSeeDoctor: str,
  recommendedSpecialty: { type: "string", enum: ["General Practice", "Paediatrics", "Obstetrics & Gynaecology", "Physiotherapy", "Nursing"] },
});

const DRUG_SCHEMA = obj({
  drug: str, drugClass: str, indications: strArr,
  dosing: { type: "array", items: obj({ population: str, dose: str, route: str, frequency: str, duration: str, maxDose: str }) },
  adjustments: strArr, contraindications: strArr, interactions: strArr, sideEffects: strArr,
  pregnancyLactation: str, monitoring: strArr, counselling: strArr,
});

const DIFFERENTIAL_SCHEMA = obj({
  summary: str,
  differentials: { type: "array", items: obj({ condition: str, likelihood: { type: "string", enum: ["most likely", "likely", "consider", "must not miss"] }, supporting: str, against: str }) },
  redFlags: strArr, history: strArr, examination: strArr, investigations: strArr, initialManagement: strArr, referWhen: str,
});

const ANSWER_SCHEMA = obj({ answer: str, drugKeywords: strArr });

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []);
const text = (v: unknown, fallback = ""): string => (typeof v === "string" && v.trim() ? v.trim() : fallback);

// ── LLM layer: Hugging Face (free) → Anthropic → none ────────────────────────

async function hfChat(system: string, user: string, maxTokens: number): Promise<string> {
  // Llama 3.1 8B on the free Hugging Face Inference Providers router — capable,
  // reliably hosted, and works on a free fine-grained token. Override the model
  // with HF_MODEL, or point HF_ENDPOINT at a dedicated endpoint (e.g. to run a
  // specialised medical model). Note: most community fine-tunes are NOT on the
  // free router; they need a dedicated endpoint.
  const model = process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct";
  const endpoint = process.env.HF_ENDPOINT || "https://router.huggingface.co/v1/chat/completions";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`HF ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

/**
 * Claude, with the answer constrained to `schema` (structured outputs) so a
 * clinical answer can never come back malformed. If the safety classifier
 * declines, the request is re-run on a fallback model server-side.
 */
async function anthropicChat(system: string, user: string, maxTokens: number, schema?: Record<string, unknown>): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-06-01"],
    fallbacks: [{ model: "claude-opus-4-8" }],
    system,
    messages: [{ role: "user", content: user }],
    output_config: { effort: "medium", ...(schema ? { format: { type: "json_schema", schema } } : {}) },
  });
  if (message.stop_reason === "refusal") return "";
  return message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

type LlmResult = { text: string; source: "claude" | "basic" } | null;

/** Claude when configured (accurate, schema-enforced); otherwise the free Hugging Face model. */
async function llmComplete(system: string, user: string, maxTokens: number, schema?: Record<string, unknown>): Promise<LlmResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const t = await anthropicChat(system, user, maxTokens, schema);
      if (t.trim()) return { text: t, source: "claude" };
    } catch (e) {
      console.error("[ai] Claude request failed", e instanceof Error ? e.message : e);
    }
  }
  if (process.env.HF_API_TOKEN) {
    try {
      const t = await hfChat(system, user + (schema ? `\n\nRespond with JSON only, matching this JSON Schema:\n${JSON.stringify(schema)}` : ""), Math.min(maxTokens, 2500));
      if (t.trim()) return { text: t, source: "basic" };
    } catch (e) {
      console.error("[ai] HF request failed", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** Removes chain-of-thought reasoning wrappers (e.g. <think>…</think>). */
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?(?:reasoning|thought|scratchpad)>/gi, "")
    .trim();
}

/** Extracts a JSON object from possibly-noisy model output (COT-aware). */
function extractJson<T>(text: string): T | null {
  const clean = stripReasoning(text);
  // Prefer the last {...} block — COT models put the final answer at the end.
  const matches = clean.match(/\{[\s\S]*?\}/g);
  const candidate = clean.match(/\{[\s\S]*\}/)?.[0] ?? matches?.[matches.length - 1];
  if (!candidate) return null;
  try { return JSON.parse(candidate) as T; } catch { /* try greedy below */ }
  const greedy = clean.match(/\{[\s\S]*\}/)?.[0];
  if (greedy) { try { return JSON.parse(greedy) as T; } catch { return null; } }
  return null;
}

/** Maps common patient complaints to OTC product keywords (used to suggest
 *  pharmacy items even when no AI provider is configured). */
const SYMPTOM_OTC: [RegExp, string[]][] = [
  [/fever|pain|headache|ache|migraine|cramp/i, ["paracetamol", "ibuprofen"]],
  [/diarr|loose stool|dehydrat|vomit|stomach/i, ["ors", "zinc"]],
  [/cold|congest|block|nasal|sinus|runny/i, ["saline"]],
  [/vitamin|immun|weak|tired|fatigue|nutrition/i, ["vitamin c", "zinc"]],
  [/fungal|itch|rash|skin|ringworm|eczema/i, ["clotrimazole", "hydrocortisone"]],
];

function expandSymptomKeywords(text: string): string[] {
  const out = new Set<string>();
  for (const [re, kws] of SYMPTOM_OTC) if (re.test(text)) kws.forEach((k) => out.add(k));
  return [...out];
}

// ── Pharmacy cross-reference ─────────────────────────────────────────────────

/** Matches suggested keywords against in-stock pharmacy products (best first). */
async function matchPharmacy(keywords: string[], opts: { includeRx: boolean }): Promise<PharmacySuggestion[]> {
  const kw = keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length > 2);
  if (kw.length === 0) return [];

  const drugs = await db.drug.findMany({
    where: {
      isActive: true,
      listings: { some: { isActive: true, stockQty: { gt: 0 } } },
      ...(opts.includeRx ? {} : { requiresPrescription: false }),
    },
    select: {
      id: true, name: true, genericName: true, category: true, imageUrl: true, requiresPrescription: true,
      listings: { where: { isActive: true, stockQty: { gt: 0 } }, select: { priceKes: true }, orderBy: { priceKes: "asc" }, take: 1 },
    },
  });

  const scored = drugs
    .map((d) => {
      const hay = `${d.name} ${d.genericName ?? ""} ${d.category}`.toLowerCase();
      const score = kw.reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0);
      return { d, score };
    })
    .filter((x) => x.score > 0 && x.d.listings.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return scored.map(({ d }) => ({
    id: d.id, name: d.name, category: d.category, priceKes: d.listings[0]!.priceKes,
    imageUrl: d.imageUrl, requiresPrescription: d.requiresPrescription,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export const aiService = {
  async symptomCheck(symptoms: string, ctx: PatientContext = {}): Promise<SymptomCheckResult> {
    const prompt = `Symptoms in the patient's words:\n"""${symptoms}"""\n\nAbout the patient:\n${describeContext(ctx)}

Give:
- urgency: self_care (safe to manage at home), routine (see a clinician in the next few days), urgent (today), or emergency (now).
- summary: 2-4 sentences explaining what is probably going on and what to do first.
- possibleCauses: 2-5 causes, most likely first, each with a one-sentence reason tied to their symptoms.
- selfCare: 3-6 specific, practical steps.
- otcOptions: 0-3 over-the-counter medicines with how to take them (adult dose, frequency, maximum per day) and a caution. Leave empty if none is appropriate, and respect their allergies, conditions, pregnancy and current medicines.
- redFlags: 3-6 warning signs that mean they should seek care urgently.
- whenToSeeDoctor: one sentence on when to book a consultation.
- recommendedSpecialty: the best kind of Care Bora clinician for this.`;

    const res = await llmComplete(PATIENT_SYSTEM, prompt, 4000, SYMPTOM_SCHEMA);
    const p = res ? extractJson<Record<string, unknown>>(res.text) : null;

    const urgency: Urgency = (["self_care", "routine", "urgent", "emergency"] as const).includes(p?.urgency as Urgency) ? (p!.urgency as Urgency) : "routine";
    const otcOptions = Array.isArray(p?.otcOptions)
      ? (p!.otcOptions as Record<string, unknown>[]).map((o) => ({ name: text(o.name), howToUse: text(o.howToUse), caution: text(o.caution) || undefined })).filter((o) => o.name)
      : [];
    const possibleCauses = Array.isArray(p?.possibleCauses)
      ? (p!.possibleCauses as Record<string, unknown>[]).map((c) => ({
          name: text(c.name),
          likelihood: (["more likely", "possible", "less likely"].includes(c.likelihood as string) ? c.likelihood : "possible") as "more likely" | "possible" | "less likely",
          why: text(c.why),
        })).filter((c) => c.name)
      : [];
    const keywords = [...otcOptions.map((o) => o.name), ...expandSymptomKeywords(symptoms)];
    const pharmacySuggestions = urgency === "emergency" ? [] : await matchPharmacy(keywords, { includeRx: false });

    return {
      urgency,
      recommendedSpecialty: text(p?.recommendedSpecialty, "General Practice"),
      advice: text(p?.summary, "We couldn't analyse that right now. If you feel very unwell, get medical care; otherwise book a consultation so a clinician can assess you."),
      seekEmergencyCare: urgency === "emergency",
      possibleCauses,
      selfCare: arr(p?.selfCare),
      otcOptions,
      redFlags: arr(p?.redFlags).length ? arr(p?.redFlags) : ["Difficulty breathing or chest pain", "Confusion, fainting or a seizure", "Severe pain, or symptoms getting quickly worse", "Unable to keep fluids down"],
      whenToSeeDoctor: text(p?.whenToSeeDoctor, "Book a consultation if your symptoms last more than a few days or worry you."),
      disclaimer: DISCLAIMER,
      pharmacySuggestions,
    };
  },

  /** Clinicians only: drug reference, differential diagnosis, or a free question. */
  async clinicalQuery(mode: "drug" | "differential" | "question", query: string, ctx: PatientContext = {}) {
    const context = describeContext(ctx);
    let prompt: string, schema: Record<string, unknown>;
    if (mode === "drug") {
      prompt = `Drug: ${query}\nPatient (if given):\n${context}\n\nGive a formulary entry: class; main indications; dosing as separate rows per population (adult, child by weight band or mg/kg, elderly, and per indication where doses differ) each with dose, route, frequency, usual duration and maximum dose; renal/hepatic adjustments; contraindications; key interactions; common and serious side effects; pregnancy and breastfeeding; monitoring; patient counselling points. If patient details are given, tailor the doses and flag any problem with their allergies, conditions or medicines.`;
      schema = DRUG_SCHEMA;
    } else if (mode === "differential") {
      prompt = `Presentation: ${query}\nPatient (if given):\n${context}\n\nGive: a one-line summary; 4-8 differential diagnoses ranked (mark dangerous ones "must not miss") with supporting and against features; red flags; key history questions; examination findings to look for; investigations (bedside first, including malaria RDT/BS where relevant); initial management per Kenyan guidelines with drug names, doses and routes; when to refer or admit.`;
      schema = DIFFERENTIAL_SCHEMA;
    } else {
      prompt = `Clinical question: ${query}\nPatient (if given):\n${context}\n\nAnswer concisely and specifically (doses with units, routes, durations where relevant). Use short paragraphs or "- " bullet lines. List the medicines you mention in drugKeywords.`;
      schema = ANSWER_SCHEMA;
    }

    const res = await llmComplete(CLINICIAN_SYSTEM, prompt, 8000, schema);
    const p = res ? extractJson<Record<string, unknown>>(res.text) : null;
    const source = res?.source ?? "unavailable";
    const base = { mode, source, disclaimer: CLINICAL_DISCLAIMER } as const;

    if (!p) {
      return { ...base, answer: res ? stripReasoning(res.text).slice(0, 4000) : "The clinical assistant isn't configured. Add an ANTHROPIC_API_KEY (recommended) or HF_API_TOKEN to enable it.", pharmacySuggestions: [] as PharmacySuggestion[] };
    }
    if (mode === "drug") {
      const dosing = Array.isArray(p.dosing) ? (p.dosing as Record<string, unknown>[]).map((d) => ({
        population: text(d.population), dose: text(d.dose), route: text(d.route), frequency: text(d.frequency), duration: text(d.duration), maxDose: text(d.maxDose) || undefined,
      })).filter((d) => d.dose) : [];
      const drug = {
        drug: text(p.drug, query), drugClass: text(p.drugClass), indications: arr(p.indications), dosing,
        adjustments: arr(p.adjustments), contraindications: arr(p.contraindications), interactions: arr(p.interactions),
        sideEffects: arr(p.sideEffects), pregnancyLactation: text(p.pregnancyLactation), monitoring: arr(p.monitoring), counselling: arr(p.counselling),
      };
      return { ...base, drug, pharmacySuggestions: await matchPharmacy([drug.drug, query], { includeRx: true }) };
    }
    if (mode === "differential") {
      const differentials = Array.isArray(p.differentials) ? (p.differentials as Record<string, unknown>[]).map((d) => ({
        condition: text(d.condition),
        likelihood: (["most likely", "likely", "consider", "must not miss"].includes(d.likelihood as string) ? d.likelihood : "consider") as "most likely" | "likely" | "consider" | "must not miss",
        supporting: text(d.supporting), against: text(d.against),
      })).filter((d) => d.condition) : [];
      return {
        ...base,
        differential: {
          summary: text(p.summary), differentials, redFlags: arr(p.redFlags), history: arr(p.history), examination: arr(p.examination),
          investigations: arr(p.investigations), initialManagement: arr(p.initialManagement), referWhen: text(p.referWhen),
        },
        pharmacySuggestions: [] as PharmacySuggestion[],
      };
    }
    return { ...base, answer: text(p.answer), pharmacySuggestions: await matchPharmacy(arr(p.drugKeywords), { includeRx: true }) };
  },

  async matchProvider(concern: string): Promise<ProviderMatchResult> {
    const prompt = `A patient in Kenya needs: "${concern}".
Which Care Bora provider specialty fits best? Available: General Practice, Paediatrics, Obstetrics & Gynaecology, Physiotherapy, Nursing.
Respond with JSON only: { "recommendedSpecialty": "<string>", "reason": "<1 sentence>", "alternatives": ["<string>", "<string>"] }`;
    const res = await llmComplete(PATIENT_SYSTEM, prompt, 1000);
    const parsed = res ? extractJson<ProviderMatchResult>(res.text) : null;
    return {
      recommendedSpecialty: parsed?.recommendedSpecialty || "General Practice",
      reason: parsed?.reason || "A general practitioner can assess your concern and refer you if needed.",
      alternatives: parsed?.alternatives?.length ? parsed.alternatives : ["Nursing", "Physiotherapy"],
    };
  },

  /** Kept for older app versions: a free clinical question. */
  async factCheck(question: string): Promise<FactCheckResult> {
    const r = await aiService.clinicalQuery("question", question);
    return { answer: "answer" in r ? r.answer ?? "" : "", disclaimer: r.disclaimer, pharmacySuggestions: r.pharmacySuggestions };
  },
};

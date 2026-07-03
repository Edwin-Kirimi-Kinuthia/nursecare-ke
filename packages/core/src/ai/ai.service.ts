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

const SYSTEM_PROMPT = `You are CareBora's health assistant for Kenya. You are NOT a doctor and never give a definitive diagnosis. Be concise, warm, and use simple language. When you suggest medicines to a patient, only suggest over-the-counter (non-prescription) options. Always respond in the exact JSON shape requested — no markdown, no extra text.`;

const DISCLAIMER = "This is not medical advice. Please consult a licensed healthcare provider.";

export interface PharmacySuggestion {
  id: string;
  name: string;
  category: string;
  priceKes: number;
  imageUrl: string | null;
  requiresPrescription: boolean;
}

export interface SymptomCheckResult {
  urgency: "routine" | "urgent" | "emergency";
  recommendedSpecialty: string;
  advice: string;
  seekEmergencyCare: boolean;
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

// ── LLM layer: Hugging Face (free) → Anthropic → none ────────────────────────

async function hfChat(system: string, user: string, maxTokens: number): Promise<string> {
  const model = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";
  const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
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
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HF ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function anthropicChat(system: string, user: string, maxTokens: number): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

/** Returns raw completion text, or null if no provider is configured/available. */
async function llmComplete(system: string, user: string, maxTokens: number): Promise<string | null> {
  if (process.env.HF_API_TOKEN) {
    try {
      const t = await hfChat(system, user, maxTokens);
      if (t.trim()) return t;
    } catch {
      /* fall through */
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const t = await anthropicChat(system, user, maxTokens);
      if (t.trim()) return t;
    } catch {
      /* fall through */
    }
  }
  return null;
}

/** Extracts the first JSON object from possibly-noisy model output. */
function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as T; } catch { return null; }
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

  const products = await db.product.findMany({
    where: {
      isActive: true,
      stockQty: { gt: 0 },
      ...(opts.includeRx ? {} : { requiresPrescription: false }),
    },
    select: { id: true, name: true, genericName: true, category: true, priceKes: true, imageUrl: true, requiresPrescription: true },
  });

  const scored = products
    .map((p) => {
      const hay = `${p.name} ${p.genericName ?? ""} ${p.category}`.toLowerCase();
      const score = kw.reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return scored.map(({ p }) => ({
    id: p.id, name: p.name, category: p.category, priceKes: p.priceKes,
    imageUrl: p.imageUrl, requiresPrescription: p.requiresPrescription,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export const aiService = {
  async symptomCheck(symptoms: string, patientAge?: number, allergies?: string[]): Promise<SymptomCheckResult> {
    const prompt = `Patient symptoms: "${symptoms}"${patientAge ? `. Age: ${patientAge}` : ""}${allergies?.length ? `. Known allergies: ${allergies.join(", ")}` : ""}.

Respond with a JSON object matching this exact shape:
{
  "urgency": "routine" | "urgent" | "emergency",
  "recommendedSpecialty": "<one of: General Practice, Paediatrics, Obstetrics & Gynaecology, Physiotherapy, Nursing>",
  "advice": "<1-2 sentence practical advice>",
  "seekEmergencyCare": <boolean>,
  "otcKeywords": ["<over-the-counter medicine or ingredient names that may help, e.g. paracetamol, ORS>"]
}
Only suggest over-the-counter medicines in otcKeywords. Only respond with the JSON object.`;

    const raw = await llmComplete(SYSTEM_PROMPT, prompt, 400);
    const parsed = raw
      ? extractJson<{ urgency?: string; recommendedSpecialty?: string; advice?: string; seekEmergencyCare?: boolean; otcKeywords?: string[] }>(raw)
      : null;

    const urgency = (["routine", "urgent", "emergency"] as const).includes(parsed?.urgency as "routine")
      ? (parsed!.urgency as "routine" | "urgent" | "emergency")
      : "routine";
    const keywords = [...(parsed?.otcKeywords ?? []), ...expandSymptomKeywords(symptoms)];
    const pharmacySuggestions = await matchPharmacy(keywords, { includeRx: false });

    return {
      urgency,
      recommendedSpecialty: parsed?.recommendedSpecialty || "General Practice",
      advice: parsed?.advice || "Please consult a healthcare provider for a proper assessment.",
      seekEmergencyCare: parsed?.seekEmergencyCare ?? urgency === "emergency",
      disclaimer: DISCLAIMER,
      pharmacySuggestions,
    };
  },

  async matchProvider(concern: string): Promise<ProviderMatchResult> {
    const prompt = `A patient in Kenya needs: "${concern}".
Which CareBora provider specialty fits best? Available: General Practice, Paediatrics, Obstetrics & Gynaecology, Physiotherapy, Nursing.
Respond with JSON only:
{ "recommendedSpecialty": "<string>", "reason": "<1 sentence>", "alternatives": ["<string>", "<string>"] }`;

    const raw = await llmComplete(SYSTEM_PROMPT, prompt, 200);
    const parsed = raw ? extractJson<ProviderMatchResult>(raw) : null;
    return {
      recommendedSpecialty: parsed?.recommendedSpecialty || "General Practice",
      reason: parsed?.reason || "A general practitioner can assess your concern and refer you if needed.",
      alternatives: parsed?.alternatives?.length ? parsed.alternatives : ["Nursing", "Physiotherapy"],
    };
  },

  /**
   * Clinical fact-check for providers during a consultation. May reference
   * prescription medicines and cross-references the CareBora pharmacy.
   */
  async factCheck(question: string): Promise<FactCheckResult> {
    const system = `You are a clinical reference assistant for licensed healthcare providers in Kenya. Give concise, evidence-based answers (dosing, interactions, first-line options, red flags). Note that clinical judgement and local guidelines apply. Respond in the exact JSON shape requested.`;
    const prompt = `Clinician question: "${question}".
Respond with JSON only:
{ "answer": "<concise evidence-based answer, 2-5 sentences>", "drugKeywords": ["<relevant medicine or ingredient names mentioned>"] }`;

    const raw = await llmComplete(system, prompt, 500);
    const parsed = raw ? extractJson<{ answer?: string; drugKeywords?: string[] }>(raw) : null;

    const answer = parsed?.answer
      || (raw?.trim() ? raw.trim().slice(0, 800)
        : "AI reference is not configured. Set HF_API_TOKEN (free Hugging Face token) to enable clinical fact-checks.");
    const pharmacySuggestions = await matchPharmacy(parsed?.drugKeywords ?? [], { includeRx: true });

    return {
      answer,
      disclaimer: "AI-generated reference for clinicians. Verify against current guidelines and use clinical judgement.",
      pharmacySuggestions,
    };
  },
};

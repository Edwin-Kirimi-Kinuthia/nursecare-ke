import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are CareBora's health triage assistant for Kenya. You help patients understand their symptoms and find the right healthcare provider. You are NOT a doctor and do NOT provide diagnoses. Always include a clear disclaimer. Be concise, warm, and use simple language. Respond in JSON only.`;

export interface SymptomCheckResult {
  urgency: "routine" | "urgent" | "emergency";
  recommendedSpecialty: string;
  advice: string;
  seekEmergencyCare: boolean;
  disclaimer: string;
}

export interface ProviderMatchResult {
  recommendedSpecialty: string;
  reason: string;
  alternatives: string[];
}

function fallbackSymptom(): SymptomCheckResult {
  return {
    urgency: "routine",
    recommendedSpecialty: "General Practice",
    advice: "Please consult a healthcare provider for a proper assessment.",
    seekEmergencyCare: false,
    disclaimer: "This is not medical advice. Please consult a licensed healthcare provider.",
  };
}

function fallbackMatch(): ProviderMatchResult {
  return {
    recommendedSpecialty: "General Practice",
    reason: "A general practitioner can assess your concern and refer you if needed.",
    alternatives: ["Nurse", "Physiotherapist"],
  };
}

export const aiService = {
  async symptomCheck(symptoms: string, patientAge?: number, allergies?: string[]): Promise<SymptomCheckResult> {
    if (!process.env.ANTHROPIC_API_KEY) return fallbackSymptom();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Patient symptoms: "${symptoms}"${patientAge ? `. Age: ${patientAge}` : ""}${allergies?.length ? `. Known allergies: ${allergies.join(", ")}` : ""}.

Respond with a JSON object matching this exact shape:
{
  "urgency": "routine" | "urgent" | "emergency",
  "recommendedSpecialty": "<string>",
  "advice": "<1-2 sentence practical advice>",
  "seekEmergencyCare": <boolean>,
  "disclaimer": "This is not medical advice. Please consult a licensed healthcare provider."
}

Only respond with the JSON object. No markdown, no extra text.`;

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      const text = (message.content[0] as { type: string; text: string }).text;
      return JSON.parse(text) as SymptomCheckResult;
    } catch {
      return fallbackSymptom();
    }
  },

  async matchProvider(concern: string): Promise<ProviderMatchResult> {
    if (!process.env.ANTHROPIC_API_KEY) return fallbackMatch();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `A patient in Kenya needs: "${concern}".

Which CareBora provider specialty fits best? Available: General Practice, Nursing, Physiotherapy, Pharmacy.

Respond with JSON only:
{
  "recommendedSpecialty": "<string>",
  "reason": "<1 sentence>",
  "alternatives": ["<string>", "<string>"]
}`;

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      const text = (message.content[0] as { type: string; text: string }).text;
      return JSON.parse(text) as ProviderMatchResult;
    } catch {
      return fallbackMatch();
    }
  },
};

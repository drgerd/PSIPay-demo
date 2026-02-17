import type { Category, CompareResponse } from "../types/contracts";

type Criteria = Record<string, unknown>;

type GeminiRecommendation = {
  recommendationShort: string;
  primaryChoice: string;
  confidence: "low" | "medium" | "high";
  keyFactors: string[];
  tradeoffs: string[];
  whatWouldChange: string[];
};

type GeminiResult =
  | { ok: true; value: GeminiRecommendation; model: string }
  | { ok: false; reason: string };

function pickModel(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function asConfidence(value: unknown): "low" | "medium" | "high" {
  const v = String(value || "").toLowerCase();
  if (v === "low" || v === "high") return v;
  return "medium";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean).slice(0, 6);
}

function parseGeminiJson(text: string): unknown {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {
    // Try fenced JSON block fallback.
  }

  const fenced = /```json\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) return JSON.parse(fenced[1]);

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  }
  throw new Error("gemini_non_json_response");
}

function normalizeRecommendation(raw: unknown): GeminiRecommendation {
  const obj = (raw || {}) as Record<string, unknown>;
  const recommendationShort = String(obj.recommendationShort || "").trim();
  const primaryChoice = String(obj.primaryChoice || "").trim();
  const keyFactors = asStringArray(obj.keyFactors);
  const tradeoffs = asStringArray(obj.tradeoffs);
  const whatWouldChange = asStringArray(obj.whatWouldChange);

  if (!recommendationShort || !primaryChoice || keyFactors.length === 0) {
    throw new Error("gemini_missing_required_fields");
  }

  return {
    recommendationShort,
    primaryChoice,
    confidence: asConfidence(obj.confidence),
    keyFactors,
    tradeoffs,
    whatWouldChange,
  };
}

function buildPrompt(category: Category, compare: CompareResponse, criteria: Criteria): string {
  return [
    "You are a UK personal finance decision assistant.",
    "Use ONLY the provided deterministic metrics and trends. Do not invent numbers.",
    "Return JSON only (no markdown).",
    "",
    `Category: ${category}`,
    `Criteria: ${JSON.stringify(criteria)}`,
    `CompareData: ${JSON.stringify(compare)}`,
    "",
    "JSON schema:",
    "{",
    '  "recommendationShort": "1-2 sentence plain-English summary",',
    '  "primaryChoice": "string matching an option label",',
    '  "confidence": "low|medium|high",',
    '  "keyFactors": ["2-4 short bullets"],',
    '  "tradeoffs": ["2-4 short bullets"],',
    '  "whatWouldChange": ["2-4 short bullets"]',
    "}",
  ].join("\n");
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`gemini_http_${response.status}:${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini_empty_response");
  return text;
}

export async function generateGeminiRecommendation(
  category: Category,
  compare: CompareResponse,
  criteria: Criteria
): Promise<GeminiResult> {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return { ok: false, reason: "gemini_api_key_missing" };

  const model = pickModel();
  const prompt = buildPrompt(category, compare, criteria);

  const attempts = 2;
  let lastError = "gemini_unknown_error";

  for (let i = 0; i < attempts; i += 1) {
    try {
      const text = await callGemini(model, apiKey, prompt);
      const parsed = parseGeminiJson(toText(text));
      const normalized = normalizeRecommendation(parsed);
      return { ok: true, value: normalized, model };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: false, reason: lastError };
}

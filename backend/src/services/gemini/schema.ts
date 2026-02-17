import type { GeminiRecommendation } from "./types";

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

export function parseGeminiJson(text: string): unknown {
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

export function parseAndNormalizeRecommendation(rawText: string): {
  parsed: Record<string, unknown> | undefined;
  normalized: GeminiRecommendation;
} {
  const parsed = parseGeminiJson(toText(rawText));
  const obj = (parsed || {}) as Record<string, unknown>;
  const recommendationShort = String(obj.recommendationShort || "").trim();
  const primaryChoice = String(obj.primaryChoice || "").trim();
  const nextBestAlternative = String(obj.nextBestAlternative || "").trim();
  const forecastMessage = String(obj.forecastMessage || "").trim();
  const keyFactors = asStringArray(obj.keyFactors);
  const tradeoffs = asStringArray(obj.tradeoffs);
  const whatWouldChange = asStringArray(obj.whatWouldChange);
  const actionChecklist = asStringArray(obj.actionChecklist);

  if (!recommendationShort || !primaryChoice || !forecastMessage || keyFactors.length === 0) {
    throw new Error("gemini_missing_required_fields");
  }

  return {
    parsed: parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined,
    normalized: {
      recommendationShort,
      primaryChoice,
      nextBestAlternative: nextBestAlternative || primaryChoice,
      confidence: asConfidence(obj.confidence),
      forecastMessage,
      keyFactors,
      tradeoffs,
      whatWouldChange,
      actionChecklist,
    },
  };
}

import type { Category, CompareResponse } from "../types/contracts";
import { buildPrompt } from "./gemini/prompts";
import { parseAndNormalizeRecommendation } from "./gemini/schema";
import type { Criteria, GeminiDebug, GeminiResult } from "./gemini/types";

function pickModel(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
  const prompt = buildPrompt(category, compare, criteria);
  const debug: GeminiDebug = { requestPrompt: prompt, errors: [] };

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return { ok: false, reason: "gemini_api_key_missing", debug };

  const model = pickModel();
  let lastError = "gemini_unknown_error";

  for (let i = 0; i < 2; i += 1) {
    try {
      const text = await callGemini(model, apiKey, prompt);
      debug.rawResponse = text;
      const { parsed, normalized } = parseAndNormalizeRecommendation(text);
      debug.parsedResponse = parsed;
      return { ok: true, value: normalized, model, debug };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      debug.errors?.push(`attempt_${i + 1}: ${lastError}`);
    }
  }

  return { ok: false, reason: lastError, debug };
}

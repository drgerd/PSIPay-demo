import type { Category, CompareResponse } from "../types/contracts";
import { buildPrompt } from "./gemini/prompts";
import { parseAndNormalizeRecommendation } from "./gemini/schema";
import type { Criteria, GeminiResult } from "./gemini/types";

function pickModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
}

function allowClientGeminiKey(): boolean {
  return String(process.env.ALLOW_CLIENT_GEMINI_KEY || "false").toLowerCase() === "true";
}

function geminiTimeoutMs(): number {
  const defaultTimeout = 40000;
  const parsed = Number.parseInt(String(process.env.GEMINI_TIMEOUT_MS || String(defaultTimeout)), 10);
  if (!Number.isFinite(parsed)) return defaultTimeout;
  return Math.max(1000, Math.min(40000, parsed));
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const timeoutMs = geminiTimeoutMs();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: abortController.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`gemini_timeout_${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

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
  criteria: Criteria,
  apiKeyOverride?: string
): Promise<GeminiResult> {
  const prompt = buildPrompt(category, compare, criteria);

  const keyOverride = String(apiKeyOverride || "").trim();
  const apiKey = allowClientGeminiKey() && keyOverride ? keyOverride : String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return { ok: false, reason: "gemini_api_key_missing" };

  const model = pickModel();

  try {
    const text = await callGemini(model, apiKey, prompt);
    const normalized = parseAndNormalizeRecommendation(text);
    return { ok: true, value: normalized, model };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      JSON.stringify({
        event: "gemini_call_failed",
        model,
        attempt: 1,
        reason: reason.slice(0, 160),
      })
    );
    return { ok: false, reason };
  }
}

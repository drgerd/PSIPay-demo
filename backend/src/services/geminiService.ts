import type { Category, CompareResponse } from "../types/contracts";
import { buildPrompt } from "./gemini/prompts";
import { parseAndNormalizeRecommendation } from "./gemini/schema";
import type { Criteria, GeminiResult } from "./gemini/types";

function pickModel(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

function geminiTimeoutMs(): number {
  const defaultTimeout = 35000;
  const parsed = Number.parseInt(String(process.env.GEMINI_TIMEOUT_MS || String(defaultTimeout)), 10);
  if (!Number.isFinite(parsed)) return defaultTimeout;
  return Math.max(1000, Math.min(35000, parsed));
}

function geminiMaxAttempts(): number {
  const defaultAttempts = 2;
  const parsed = Number.parseInt(String(process.env.GEMINI_MAX_ATTEMPTS || String(defaultAttempts)), 10);
  if (!Number.isFinite(parsed)) return defaultAttempts;
  return Math.max(1, Math.min(2, parsed));
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
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
  criteria: Criteria
): Promise<GeminiResult> {
  const prompt = buildPrompt(category, compare, criteria);

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return { ok: false, reason: "gemini_api_key_missing" };

  const model = pickModel();
  const attempts = geminiMaxAttempts();
  let lastError = "gemini_unknown_error";

  for (let i = 0; i < attempts; i += 1) {
    try {
      const text = await callGemini(model, apiKey, prompt);
      const normalized = parseAndNormalizeRecommendation(text);
      return { ok: true, value: normalized, model };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: false, reason: lastError };
}

import type { Category, CompareResponse } from "../types/contracts";
import { buildPrompt } from "./gemini/prompts";
import { parseAndNormalizeRecommendation } from "./gemini/schema";
import type { Criteria, GeminiResult } from "./gemini/types";

function pickModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}

function modelCandidates(): string[] {
  const preferred = pickModel();
  return Array.from(new Set([preferred, "gemini-2.0-flash", "gemini-1.5-flash-latest"])).filter(Boolean);
}

function allowClientGeminiKey(): boolean {
  return String(process.env.ALLOW_CLIENT_GEMINI_KEY || "false").toLowerCase() === "true";
}

function geminiTimeoutMs(): number {
  const defaultTimeout = process.env.AWS_SAM_LOCAL === "true" ? 35000 : 20000;
  const parsed = Number.parseInt(String(process.env.GEMINI_TIMEOUT_MS || String(defaultTimeout)), 10);
  if (!Number.isFinite(parsed)) return defaultTimeout;
  return Math.max(1000, Math.min(35000, parsed));
}

function geminiMaxAttempts(): number {
  const defaultAttempts = process.env.AWS_SAM_LOCAL === "true" ? 2 : 1;
  const parsed = Number.parseInt(String(process.env.GEMINI_MAX_ATTEMPTS || String(defaultAttempts)), 10);
  if (!Number.isFinite(parsed)) return defaultAttempts;
  return Math.max(1, Math.min(2, parsed));
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<string> {
  async function sendRequest(apiVersion: "v1" | "v1beta", withJsonMime: boolean): Promise<string> {
    const url =
      `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent` +
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
            ...(withJsonMime ? { responseMimeType: "application/json" } : {}),
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

  const requestVariants: Array<{ apiVersion: "v1" | "v1beta"; withJsonMime: boolean }> = [
    { apiVersion: "v1beta", withJsonMime: true },
    { apiVersion: "v1beta", withJsonMime: false },
    { apiVersion: "v1", withJsonMime: true },
    { apiVersion: "v1", withJsonMime: false },
  ];

  let lastError = "gemini_unknown_error";
  for (const variant of requestVariants) {
    try {
      return await sendRequest(variant.apiVersion, variant.withJsonMime);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      lastError = reason;
      if (reason.startsWith("gemini_timeout_")) throw err;
      if (reason.startsWith("gemini_http_429")) throw err;
    }
  }

  throw new Error(lastError);
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

  const models = modelCandidates();
  const attempts = geminiMaxAttempts();
  let lastError = "gemini_unknown_error";

  for (let i = 0; i < attempts; i += 1) {
    for (const model of models) {
      try {
        const text = await callGemini(model, apiKey, prompt);
        const normalized = parseAndNormalizeRecommendation(text);
        return { ok: true, value: normalized, model };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(
          JSON.stringify({
            event: "gemini_call_failed",
            model,
            attempt: i + 1,
            reason: lastError.slice(0, 160),
          })
        );
      }
    }
  }

  return { ok: false, reason: lastError };
}

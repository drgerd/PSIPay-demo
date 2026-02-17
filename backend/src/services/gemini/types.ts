import type { Category, CompareResponse } from "../../types/contracts";

export type Criteria = Record<string, unknown>;

export type GeminiRecommendation = {
  recommendationShort: string;
  primaryChoice: string;
  nextBestAlternative: string;
  confidence: "low" | "medium" | "high";
  forecastMessage: string;
  keyFactors: string[];
  tradeoffs: string[];
  whatWouldChange: string[];
  actionChecklist: string[];
};

export type GeminiResult =
  | { ok: true; value: GeminiRecommendation; model: string }
  | { ok: false; reason: string };

export type BuildPrompt = (category: Category, compare: CompareResponse, criteria: Criteria) => string;

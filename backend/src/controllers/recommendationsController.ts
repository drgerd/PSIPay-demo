import type { Category, RecommendationsResponse } from "../types/contracts";
import { buildLiveCompare, buildLiveRecommendation } from "../services/compareService";
import { generateGeminiRecommendation } from "../services/geminiService";

type Criteria = Record<string, unknown>;

function publicAiFailureReason(reason: string): string {
  if (reason === "gemini_api_key_missing") return "ai_not_configured";
  if (reason.startsWith("gemini_timeout_")) return "ai_timeout";
  if (reason.startsWith("gemini_http_4")) return "ai_request_error";
  return "ai_unavailable";
}

export async function recommend(
  category: Category,
  criteria: Criteria,
  options?: { geminiApiKeyOverride?: string }
): Promise<RecommendationsResponse> {
  const compare = await buildLiveCompare(category, criteria);
  const deterministic = buildLiveRecommendation(category, compare, criteria);
  const ai = await generateGeminiRecommendation(category, compare, criteria, options?.geminiApiKeyOverride);

  if (!ai.ok) {
    return {
      ...deterministic,
      ai: {
        used: false,
        fallback: true,
        reason: publicAiFailureReason(ai.reason),
      },
    };
  }

  const optionLabels = new Set(compare.options.map((o) => o.label));
  const keepDeterministicRanking = category === "credit-cards";
  const primaryChoice = keepDeterministicRanking
    ? deterministic.recommendation.primaryChoice
    : optionLabels.has(ai.value.primaryChoice)
      ? ai.value.primaryChoice
      : deterministic.recommendation.primaryChoice;
  const nextBestAlternative = keepDeterministicRanking
    ? deterministic.recommendation.nextBestAlternative
    : optionLabels.has(ai.value.nextBestAlternative) && ai.value.nextBestAlternative !== primaryChoice
      ? ai.value.nextBestAlternative
      : deterministic.recommendation.nextBestAlternative;

  return {
    ...deterministic,
    recommendationShort: ai.value.recommendationShort,
    recommendation: {
      primaryChoice,
      nextBestAlternative,
      confidence: ai.value.confidence,
      forecastMessage: ai.value.forecastMessage,
      keyFactors: ai.value.keyFactors,
      tradeoffs: ai.value.tradeoffs,
      whatWouldChange: ai.value.whatWouldChange,
      actionChecklist: ai.value.actionChecklist,
    },
    ai: {
      used: true,
      fallback: false,
      model: ai.model,
    },
  };
}

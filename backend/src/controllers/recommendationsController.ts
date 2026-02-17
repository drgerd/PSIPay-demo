import type { Category, RecommendationsResponse } from "../types/contracts";
import { buildLiveCompare, buildLiveRecommendation } from "../services/compareService";
import { generateGeminiRecommendation } from "../services/geminiService";

type Criteria = Record<string, unknown>;

export async function recommend(
  category: Category,
  criteria: Criteria,
  options?: { skipCache?: boolean }
): Promise<RecommendationsResponse> {
  const compare = await buildLiveCompare(category, criteria, options);
  const deterministic = buildLiveRecommendation(category, compare, criteria);
  const ai = await generateGeminiRecommendation(category, compare, criteria);

  if (!ai.ok) {
    return {
      ...deterministic,
      ai: {
        used: false,
        fallback: true,
        reason: ai.reason,
      },
    };
  }

  const optionLabels = new Set(compare.options.map((o) => o.label));
  const primaryChoice = optionLabels.has(ai.value.primaryChoice)
    ? ai.value.primaryChoice
    : deterministic.recommendation.primaryChoice;

  return {
    ...deterministic,
    recommendationShort: ai.value.recommendationShort,
    recommendation: {
      primaryChoice,
      confidence: ai.value.confidence,
      keyFactors: ai.value.keyFactors,
      tradeoffs: ai.value.tradeoffs,
      whatWouldChange: ai.value.whatWouldChange,
    },
    ai: {
      used: true,
      fallback: false,
      model: ai.model,
    },
  };
}

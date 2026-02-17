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
        debug: ai.debug,
      },
    };
  }

  const optionLabels = new Set(compare.options.map((o) => o.label));
  const primaryChoice = optionLabels.has(ai.value.primaryChoice)
    ? ai.value.primaryChoice
    : deterministic.recommendation.primaryChoice;
  const nextBestAlternative =
    optionLabels.has(ai.value.nextBestAlternative) && ai.value.nextBestAlternative !== primaryChoice
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
      debug: ai.debug,
    },
  };
}

import type { Category, RecommendationsResponse } from "../types/contracts";
import { buildLiveCompare, buildLiveRecommendation } from "../services/compareService";

type Criteria = Record<string, unknown>;

export async function recommend(
  category: Category,
  criteria: Criteria,
  options?: { skipCache?: boolean }
): Promise<RecommendationsResponse> {
  const compare = await buildLiveCompare(category, criteria, options);
  return buildLiveRecommendation(category, compare, criteria);
}

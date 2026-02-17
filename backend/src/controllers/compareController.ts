import type { Category, CompareResponse } from "../types/contracts";
import { buildLiveCompare } from "../services/compareService";

type Criteria = Record<string, unknown>;

export async function compareOptions(
  category: Category,
  criteria: Criteria,
  options?: { skipCache?: boolean }
): Promise<CompareResponse> {
  return buildLiveCompare(category, criteria, options);
}

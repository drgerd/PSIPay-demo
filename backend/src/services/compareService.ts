import type { Category, CompareResponse, RecommendationsResponse } from "../types/contracts";
import { getLiveProducts } from "./liveData";
import { buildCreditCardCompare } from "./compare/credit-cards";
import { buildMortgageCompare } from "./compare/mortgages";
import { buildDeterministicRecommendation } from "./compare/recommendation";
import { buildSavingsCompare } from "./compare/savings";
import { Criteria, historyMonthsFromCriteria } from "./compare/shared";

function buildCompareByCategory(
  category: Category,
  criteria: Criteria,
  products: Awaited<ReturnType<typeof getLiveProducts>>
): CompareResponse {
  if (category === "mortgages") return buildMortgageCompare(products, criteria);
  if (category === "savings") return buildSavingsCompare(products, criteria);
  return buildCreditCardCompare(products, criteria);
}

export async function buildLiveCompare(
  category: Category,
  criteria: Criteria
): Promise<CompareResponse> {
  const months = historyMonthsFromCriteria(criteria);
  const products = await getLiveProducts(category, undefined, { months });
  const compare = buildCompareByCategory(category, criteria, products);
  return {
    ...compare,
    ...(products.stale ? { stale: true } : {}),
  };
}

export function buildLiveRecommendation(
  category: Category,
  compare: CompareResponse,
  criteria: Criteria
): RecommendationsResponse {
  return buildDeterministicRecommendation(category, compare, criteria);
}

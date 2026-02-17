import type { Category, CompareResponse } from "../../types/contracts";
import { asBool, asNumber, asStringArray } from "../../utils/coerce";
import type { Criteria } from "./types";

type NormalizedCreditCardCriteria = {
  monthlySpend: number;
  payInFullMonthly: boolean;
  carryDebt: boolean;
  carryDebtAmount: number;
  topCategories: string[];
  primaryGoal: string;
};

function normalizeCreditCardCriteria(criteria: Criteria): NormalizedCreditCardCriteria {
  const allowedCategories = new Set([
    "groceries",
    "fuel/transport",
    "travel",
    "dining",
    "online shopping",
    "general",
  ]);
  const allowedGoals = new Set([
    "minimize interest",
    "maximize rewards",
    "simplicity/no fees",
    "travel benefits",
  ]);

  const monthlySpend = Math.max(0, asNumber(criteria.monthlySpend, 1200));
  const payInFullMonthly = asBool(criteria.payInFullMonthly, true);
  const carryDebt = asBool(criteria.carryDebt, !payInFullMonthly);
  const carryDebtAmount = Math.max(0, asNumber(criteria.carryDebtAmount, monthlySpend));
  const topCategories = asStringArray(criteria.topCategories)
    .map((v) => v.toLowerCase())
    .filter((v) => allowedCategories.has(v));
  const primaryGoalRaw = String(criteria.primaryGoal || "maximize rewards").toLowerCase();
  const primaryGoal = allowedGoals.has(primaryGoalRaw) ? primaryGoalRaw : "maximize rewards";

  return {
    monthlySpend,
    payInFullMonthly,
    carryDebt,
    carryDebtAmount,
    topCategories: topCategories.length ? topCategories : ["general"],
    primaryGoal,
  };
}

function buildCreditCardsPrompt(compare: CompareResponse, criteria: Criteria): string {
  const normalized = normalizeCreditCardCriteria(criteria);
  const ranking = compare.options.slice(0, 5).map((option) => ({
    type: option.label,
    score: option.metrics.score,
    estimatedAnnualValue: option.metrics.estimated_annual_value,
    estimatedAnnualRewards: option.metrics.estimated_annual_rewards,
    estimatedAnnualInterestCost: option.metrics.estimated_annual_interest_cost,
    assumedAnnualFee: option.metrics.assumed_annual_fee,
    notes: option.metrics.notes,
  }));

  return [
    "You are a UK personal finance explainer for credit card type selection.",
    "Do not decide ranking. Ranking is deterministic and final.",
    "Use only provided numbers and profile. Do not invent data.",
    "Tone: practical and plain language, no financial advice.",
    "Return JSON only (no markdown).",
    "",
    "Category: credit-cards",
    `UserProfile: ${JSON.stringify(normalized)}`,
    `DeterministicRanking: ${JSON.stringify(ranking)}`,
    `Assumptions: ${JSON.stringify(compare.assumptions)}`,
    "",
    "JSON schema:",
    "{",
    '  "recommendationShort": "1-2 sentence summary aligned with top deterministic type label",',
    '  "primaryChoice": "must match deterministic top type label",',
    '  "nextBestAlternative": "must match deterministic second type label",',
    '  "confidence": "low|medium|high",',
    '  "forecastMessage": "2-3 sentence scenario note for next 6-12 months",',
    '  "keyFactors": ["2-4 short bullets tied to profile + ranking numbers"],',
    '  "tradeoffs": ["2-4 short bullets"],',
    '  "whatWouldChange": ["2-4 short bullets including a pay-in-full vs revolving what-if"],',
    '  "actionChecklist": ["2-4 short practical actions"]',
    "}",
  ].join("\n");
}

function buildGenericPrompt(category: Category, compare: CompareResponse, criteria: Criteria): string {
  return [
    "You are a UK personal finance decision assistant.",
    "Use ONLY the provided deterministic metrics and trends. Do not invent numbers.",
    "Return JSON only (no markdown).",
    "",
    `Category: ${category}`,
    `Criteria: ${JSON.stringify(criteria)}`,
    `CompareData: ${JSON.stringify(compare)}`,
    "",
    "JSON schema:",
    "{",
    '  "recommendationShort": "1-2 sentence plain-English summary",',
    '  "primaryChoice": "string matching an option label",',
    '  "nextBestAlternative": "string matching another option label",',
    '  "confidence": "low|medium|high",',
    '  "forecastMessage": "2-3 sentence scenario-based 6-12 month outlook",',
    '  "keyFactors": ["2-4 short bullets"],',
    '  "tradeoffs": ["2-4 short bullets"],',
    '  "whatWouldChange": ["2-4 short bullets"],',
    '  "actionChecklist": ["2-4 short action steps for the user"]',
    "}",
  ].join("\n");
}

export function buildPrompt(category: Category, compare: CompareResponse, criteria: Criteria): string {
  if (category === "credit-cards") return buildCreditCardsPrompt(compare, criteria);
  return buildGenericPrompt(category, compare, criteria);
}

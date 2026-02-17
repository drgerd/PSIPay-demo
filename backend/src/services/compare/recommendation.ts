import type { Category, CompareResponse, RecommendationsResponse } from "../../types/contracts";
import { asBool } from "./shared";
import type { Criteria } from "./shared";

function sortedOptions(category: Category, compare: CompareResponse) {
  if (category === "credit-cards") return [...compare.options];
  return [...compare.options].sort((a, b) => {
    const aCost = Number(a.metrics.interest_cost_over_horizon_est ?? a.metrics.est_annual_interest_cost ?? 0);
    const bCost = Number(b.metrics.interest_cost_over_horizon_est ?? b.metrics.est_annual_interest_cost ?? 0);
    return aCost - bCost;
  });
}

function summaryText(category: Category, primary: string, criteria: Criteria): string {
  const risk = String(criteria.riskTolerance || "balanced");
  if (category === "mortgages" && risk.includes("certainty")) {
    return `Given your certainty preference and current spreads, ${primary} is likely the safer option.`;
  }
  if (category === "savings") {
    return `Savings rates are best interpreted against inflation, and ${primary} currently balances return and access.`;
  }
  if (category === "credit-cards") {
    return `Based on your payment behavior and spending mix, ${primary} is the most suitable card type right now.`;
  }
  return `Based on the latest market data, ${primary} is currently the strongest fit.`;
}

function forecastMessage(category: Category): string {
  if (category === "mortgages") {
    return "If the base rate stays elevated over the next 6-12 months, fixed options are likely to remain more predictable for monthly budgeting.";
  }
  if (category === "savings") {
    return "If inflation cools faster than savings rates, real returns may improve over the next 6-12 months.";
  }
  return "If you continue carrying balances, low-APR types are likely to stay more cost-effective than rewards-focused cards.";
}

function asNum(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function formatNum(value: number | undefined, digits = 2): string {
  if (value === undefined) return "n/a";
  return value.toFixed(digits);
}

function topOption(compare: CompareResponse) {
  return compare.options[0];
}

function formatFreshness(compare: CompareResponse): string {
  const entries = Object.entries(compare.asOf || {});
  const asOfText = entries.length
    ? entries
        .slice(0, 3)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    : "source timestamps unavailable";
  if (compare.stale) {
    return `Uses cached fallback data due to upstream issues (${asOfText}).`;
  }
  return `Uses latest available source timestamps (${asOfText}).`;
}

function keyFactorsFromTop(category: Category, compare: CompareResponse): string[] {
  const top = topOption(compare);
  if (!top) return ["Based on latest available BoE/ONS series."];

  if (category === "mortgages") {
    const monthly = asNum(top.metrics.monthly_payment_est);
    const horizonCost = asNum(top.metrics.interest_cost_over_horizon_est);
    return [
      monthly !== undefined
        ? `${top.label} estimated monthly payment is ${monthly.toFixed(2)}.`
        : `${top.label} leads on deterministic mortgage cost scoring.`,
      horizonCost !== undefined
        ? `${top.label} estimated interest over horizon is ${horizonCost.toFixed(2)}.`
        : "Compared using deterministic, transparent assumptions.",
    ];
  }

  if (category === "savings") {
    const rate = asNum(top.rate_pct);
    const realRate = asNum(top.metrics.real_rate_pct);
    return [
      rate !== undefined ? `${top.label} nominal rate is ${rate.toFixed(2)}%.` : `${top.label} currently ranks first.`,
      realRate !== undefined
        ? `Estimated real rate after inflation is ${realRate.toFixed(2)}%.`
        : "Real return is evaluated against CPIH inflation.",
    ];
  }

  const score = asNum(top.metrics.score);
  const annualValue = asNum(top.metrics.estimated_annual_value);
  return [
    score !== undefined ? `${top.label} deterministic score is ${score.toFixed(1)}.` : `${top.label} currently ranks first.`,
    annualValue !== undefined
      ? `${top.label} estimated annual net value is ${annualValue.toFixed(2)}.`
      : "Compared with deterministic spending, debt, and goal-based scoring.",
  ];
}

function tradeoffsByCategory(category: Category, compare: CompareResponse): string[] {
  const top = topOption(compare);

  if (category === "mortgages") {
    const rate = asNum(top?.rate_pct);
    const monthly = asNum(top?.metrics.monthly_payment_est);
    return [
      `Best-fit option (${top?.label || "top option"}) at ~${formatNum(rate)}% can still feel expensive if household cash flow tightens.`,
      `Estimated monthly payment (~${formatNum(monthly)}) excludes provider-specific fees and early repayment charges.`,
      "Fixed-rate certainty may cost more than variable if base rates fall faster than expected.",
    ];
  }

  if (category === "savings") {
    const nominal = asNum(top?.rate_pct);
    const realRate = asNum(top?.metrics.real_rate_pct);
    return [
      `Current nominal return (~${formatNum(nominal)}%) can still produce weak purchasing-power growth if inflation stays elevated.`,
      `Estimated real rate (~${formatNum(realRate)}%) is sensitive to future CPIH prints, not just today's snapshot.`,
      "Easier-access products can trade convenience for lower long-term return than fixed-term products.",
    ];
  }

  const score = asNum(top?.metrics.score);
  const annualInterest = asNum(top?.metrics.estimated_annual_interest_cost);
  return [
    `Top type (${top?.label || "top option"}, score ~${formatNum(score, 1)}) may underperform if your spending pattern changes.`,
    `Estimated annual interest impact (~${formatNum(annualInterest)}) can rise quickly if balances are carried longer than assumed.`,
    "Reward-oriented cards can look attractive but lose value when fees or revolving balances increase.",
  ];
}

function whatWouldChangeByCategory(category: Category, criteria: Criteria): string[] {
  if (category === "mortgages") {
    const horizonMonths = asNum(criteria.horizonMonths);
    return [
      "A faster-than-expected Bank Rate decline could favor variable/shorter fixed terms.",
      `A different horizon (${horizonMonths !== undefined ? horizonMonths : 24} months) can change total-interest ranking meaningfully.`,
      "Provider fees, incentives, or ERC terms not in this model can change final choice.",
    ];
  }

  if (category === "savings") {
    const horizonMonths = asNum(criteria.horizonMonths);
    return [
      "If CPIH falls faster than savings rates, real-return ranking improves for cash products.",
      `A longer/shorter horizon (${horizonMonths !== undefined ? horizonMonths : 12} months assumed) can shift best-fit products.`,
      "If access needs change (e.g., emergency liquidity), convenience may outweigh incremental yield.",
    ];
  }

  const carryDebt = asBool(criteria.carryDebt, false);
  return [
    "Switching from revolving balances to full monthly repayment usually shifts ranking toward rewards-focused types.",
    carryDebt
      ? "Lower carried debt amount or faster payoff timeline can reduce low-APR advantage."
      : "If balances start rolling month-to-month, low-APR types typically become more suitable.",
    "Changes in top spend categories (travel/groceries/general) can alter value ranking.",
  ];
}

function actionChecklistByCategory(category: Category, compare: CompareResponse): string[] {
  const top = topOption(compare);

  if (category === "mortgages") {
    return [
      `Request provider quotes for ${top?.label || "top option"} including fees/ERC terms.`,
      "Re-run comparison with a second horizon (e.g., +12 months) before locking the product.",
      "Stress-test monthly budget against a modest payment increase to confirm affordability.",
    ];
  }

  if (category === "savings") {
    return [
      `Check account terms for ${top?.label || "top option"} (withdrawal limits, teaser windows, minimum balances).`,
      "Re-run with your expected contribution/withdrawal behavior to validate practical return.",
      "Review tax wrapper eligibility (e.g., ISA) before final selection.",
    ];
  }

  return [
    `Compare the top two card types with your actual monthly statement pattern (not average spend).`,
    "Set a repayment guardrail (autopay or target payoff date) before applying.",
    "Confirm fee structure, intro periods, and revert APR details before final choice.",
  ];
}

export function buildDeterministicRecommendation(
  category: Category,
  compare: CompareResponse,
  criteria: Criteria
): RecommendationsResponse {
  const sorted = sortedOptions(category, compare);
  const top = sorted[0] || compare.options[0];
  const second = sorted[1] || compare.options[1] || top;
  const primary = top?.label || "No recommendation";
  const alternative = second?.label || primary;

  return {
    category,
    recommendationShort: summaryText(category, primary, criteria),
    recommendation: {
      primaryChoice: primary,
      nextBestAlternative: alternative,
      confidence: "medium",
      forecastMessage: forecastMessage(category),
      keyFactors: keyFactorsFromTop(category, compare),
      tradeoffs: tradeoffsByCategory(category, compare),
      whatWouldChange: whatWouldChangeByCategory(category, criteria),
      actionChecklist: actionChecklistByCategory(category, compare),
    },
    disclaimer: "Educational, not financial advice.",
    dataFreshnessNote: formatFreshness(compare),
    ai: {
      used: false,
      fallback: true,
      reason: "deterministic_recommendation",
    },
    compare,
  };
}

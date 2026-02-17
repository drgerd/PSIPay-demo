import type { Category, CompareResponse, RecommendationsResponse } from "../../types/contracts";
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
      keyFactors: [
        "Based on latest available BoE/ONS series",
        category === "credit-cards"
          ? "Compared with deterministic spending, debt, and goal-based scoring"
          : "Compared using deterministic, transparent assumptions",
      ],
      tradeoffs: [
        "Outcome is sensitive to future rate/inflation changes",
        "Figures are estimates and not provider-specific offers",
      ],
      whatWouldChange: [
        "Material shift in base rate path or inflation trend",
        "Different user preferences or time horizon",
      ],
      actionChecklist: [
        "Review the top two options side by side in the comparison table",
        "Adjust your horizon or risk preference and re-run the scenario",
        "Use the trend chart to confirm whether current conditions are changing",
      ],
    },
    disclaimer: "Educational, not financial advice.",
    dataFreshnessNote: "Uses latest available source timestamps from current fetch.",
    ai: {
      used: false,
      fallback: true,
      reason: "deterministic_recommendation",
    },
    compare,
  };
}

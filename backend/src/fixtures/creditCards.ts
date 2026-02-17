import type {
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
} from "../types/contracts";
import { makeSeries } from "./months";

const asOf = "2026-02-15T10:00:00Z";

export const creditCardProducts: ProductsResponse = {
  category: "credit-cards",
  series: [
    {
      seriesCode: "CARD_TYPE_SCORE",
      label: "type-fit index",
      unit: "percent",
      asOf,
      data: makeSeries(50, 0.2),
    },
  ],
};

export const creditCardCompare: CompareResponse = {
  category: "credit-cards",
  asOf: { Model: asOf },
  assumptions: [
    "Type-only guidance uses generalized fee/APR assumptions",
    "If revolving, APR impact is weighted higher than rewards",
  ],
  options: [
    {
      id: "low-apr",
      label: "Low APR",
      metrics: {
        fit_score: 88,
        est_annual_interest_cost: 420,
        est_annual_rewards_value: 40,
      },
    },
    {
      id: "balance-transfer",
      label: "Balance transfer",
      metrics: {
        fit_score: 84,
        est_annual_interest_cost: 360,
        est_annual_rewards_value: 0,
      },
    },
    {
      id: "cashback",
      label: "Cashback",
      metrics: {
        fit_score: 72,
        est_annual_interest_cost: 610,
        est_annual_rewards_value: 140,
      },
    },
  ],
  chartSeries: [
    { label: "Low APR fit score", data: makeSeries(72, 1.2) },
    { label: "Cashback fit score", data: makeSeries(65, 0.8) },
  ],
};

export const creditCardRecommendation: RecommendationsResponse = {
  category: "credit-cards",
  recommendationShort:
    "If you sometimes carry balance, low-APR cards usually beat rewards-focused cards on net value.",
  recommendation: {
    primaryChoice: "Low APR",
    confidence: "high",
    keyFactors: [
      "Revolving behavior makes interest cost the dominant driver",
      "Estimated APR cost savings outweigh rewards upside",
      "More resilient option if monthly payoff is inconsistent",
    ],
    tradeoffs: [
      "Lower perks compared to cashback/rewards cards",
      "May underperform if you consistently pay in full",
    ],
    whatWouldChange: [
      "If you start paying full balance every month",
      "If high-category spending unlocks outsized cashback benefits",
    ],
  },
  disclaimer: "Educational, not financial advice.",
  dataFreshnessNote: "Model assumptions as-of 2026-02-15.",
  compare: creditCardCompare,
};

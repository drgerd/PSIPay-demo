import type {
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
} from "../types/contracts";
import { makeSeries } from "./months";

const asOf = "2026-02-15T10:00:00Z";

export const mortgageProducts: ProductsResponse = {
  category: "mortgages",
  series: [
    { seriesCode: "IUMBV34", label: "2y fixed", unit: "percent", asOf, data: makeSeries(5.5, -0.06) },
    { seriesCode: "IUMBV37", label: "3y fixed", unit: "percent", asOf, data: makeSeries(5.35, -0.05) },
    { seriesCode: "IUMBV42", label: "5y fixed", unit: "percent", asOf, data: makeSeries(5.1, -0.04) },
    { seriesCode: "IUMTLMV", label: "revert-to-rate", unit: "percent", asOf, data: makeSeries(6.8, -0.02) },
    { seriesCode: "IUMBEDR", label: "base rate", unit: "percent", asOf, data: makeSeries(5.25, -0.01) },
  ],
};

export const mortgageCompare: CompareResponse = {
  category: "mortgages",
  asOf: { BoE: asOf },
  assumptions: [
    "Monthly payment uses standard amortization",
    "Month-end value is the last available point in each month",
    "Variable sensitivity modeled using base-rate delta scenarios",
  ],
  options: [
    {
      id: "2y-fixed",
      label: "2y fixed",
      rate_pct: 4.84,
      metrics: {
        monthly_payment_est: 1142.55,
        interest_cost_over_horizon_est: 19031.22,
        certainty_score: 8,
      },
    },
    {
      id: "5y-fixed",
      label: "5y fixed",
      rate_pct: 4.63,
      metrics: {
        monthly_payment_est: 1117.18,
        interest_cost_over_horizon_est: 18244.77,
        certainty_score: 9,
      },
    },
    {
      id: "revert-to-rate",
      label: "revert-to-rate",
      rate_pct: 6.58,
      metrics: {
        monthly_payment_est: 1360.19,
        interest_cost_over_horizon_est: 25793.4,
        payment_if_plus_1pct: 1487.06,
      },
    },
  ],
  chartSeries: [
    { label: "2y fixed", data: makeSeries(5.5, -0.06) },
    { label: "5y fixed", data: makeSeries(5.1, -0.04) },
    { label: "revert-to-rate", data: makeSeries(6.8, -0.02) },
  ],
};

export const mortgageRecommendation: RecommendationsResponse = {
  category: "mortgages",
  recommendationShort:
    "Given current spreads and your certainty preference, a fixed-rate option is likely the safer fit now.",
  recommendation: {
    primaryChoice: "5y fixed",
    confidence: "medium",
    keyFactors: [
      "Lower estimated monthly payment than revert-to-rate",
      "Less sensitivity to base-rate movement",
      "Better fit for certainty-focused risk profile",
    ],
    tradeoffs: [
      "Less flexibility if rates fall quickly",
      "Potential early repayment charges depending on product terms",
    ],
    whatWouldChange: [
      "If base-rate path drops faster than expected",
      "If you prioritize flexibility over payment stability",
    ],
  },
  disclaimer: "Educational, not financial advice.",
  dataFreshnessNote: "BoE data as-of 2026-02-15.",
  compare: mortgageCompare,
};

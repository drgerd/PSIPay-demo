import type {
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
} from "../types/contracts";
import { makeSeries } from "./months";

const asOf = "2026-02-15T10:00:00Z";

const nominal = makeSeries(3.9, -0.03);
const cpih = makeSeries(4.1, -0.05);

export const savingsProducts: ProductsResponse = {
  category: "savings",
  series: [
    {
      seriesCode: "CFMHSCV",
      label: "household sight deposits rate",
      unit: "percent",
      asOf,
      data: nominal,
    },
    {
      seriesCode: "CPIH_YOY",
      label: "CPIH YoY",
      unit: "percent",
      asOf,
      data: cpih,
    },
  ],
};

export const savingsCompare: CompareResponse = {
  category: "savings",
  asOf: { BoE: asOf, ONS: asOf },
  assumptions: [
    "Real rate is approximated as nominal minus CPIH YoY",
    "Projection uses simple monthly compounding",
  ],
  options: [
    {
      id: "market-average-sight-deposit",
      label: "Market-average sight deposit",
      rate_pct: nominal[nominal.length - 1]?.value_pct,
      metrics: {
        inflation_yoy_pct: cpih[cpih.length - 1]?.value_pct ?? 0,
        real_rate_pct:
          (nominal[nominal.length - 1]?.value_pct ?? 0) -
          (cpih[cpih.length - 1]?.value_pct ?? 0),
        projected_balance_12m_est: 10378.2,
      },
    },
  ],
  chartSeries: [
    { label: "Savings rate (CFMHSCV)", data: nominal },
    { label: "Inflation (CPIH YoY)", data: cpih },
  ],
};

export const savingsRecommendation: RecommendationsResponse = {
  category: "savings",
  recommendationShort:
    "Current market-average sight deposit rates are close to inflation, so real gains remain limited.",
  recommendation: {
    primaryChoice: "Use savings for liquidity, not yield maximization",
    confidence: "medium",
    keyFactors: [
      "Nominal rate is near CPIH YoY",
      "Real return proxy is near zero or slightly negative",
      "Instant access supports short-term liquidity goals",
    ],
    tradeoffs: [
      "High flexibility but limited real growth",
      "Longer lock-in products may improve nominal yield but reduce access",
    ],
    whatWouldChange: [
      "If inflation cools faster than deposit rates",
      "If your access requirement becomes low and fixed-term options are acceptable",
    ],
  },
  disclaimer: "Educational, not financial advice.",
  dataFreshnessNote: "BoE and ONS data as-of 2026-02-15.",
  compare: savingsCompare,
};

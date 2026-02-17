import type {
  Category,
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
  SeriesPoint,
  SeriesItem,
} from "../types/contracts";
import { getLiveProducts } from "./liveData";

type Criteria = Record<string, unknown>;

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function historyMonthsFromCriteria(criteria: Criteria): number {
  const fallback = Number(process.env.DEFAULT_HISTORY_MONTHS || "12");
  const parsed = Math.round(asNumber(criteria.horizonMonths, fallback));
  return Math.max(1, Math.min(360, parsed));
}

function latest(series: SeriesItem): number {
  const p = series.data[series.data.length - 1];
  return p?.value_pct ?? 0;
}

function latestMonth(points: SeriesPoint[]): string | null {
  return points.length ? points[points.length - 1].month : null;
}

function takeLastMonths(points: SeriesPoint[], months: number, endMonth?: string): SeriesPoint[] {
  const filtered = endMonth ? points.filter((p) => p.month <= endMonth) : points;
  if (filtered.length <= months) return filtered;
  return filtered.slice(filtered.length - months);
}

function buildAsOf(products: ProductsResponse): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of products.series) {
    out[s.seriesCode] = s.asOf;
  }
  return out;
}

function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  const pow = (1 + r) ** termMonths;
  return (principal * r * pow) / (pow - 1);
}

function balanceAfterMonths(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  paidMonths: number
): number {
  const r = annualRatePct / 100 / 12;
  const pmt = monthlyPayment(principal, annualRatePct, termMonths);
  if (r === 0) return Math.max(0, principal - pmt * paidMonths);
  return principal * (1 + r) ** paidMonths - (pmt * ((1 + r) ** paidMonths - 1)) / r;
}

function buildMortgageCompare(products: ProductsResponse, criteria: Criteria): CompareResponse {
  const principal = asNumber(criteria.loanAmount, 200000);
  const horizon = Math.max(1, Math.min(360, Math.round(asNumber(criteria.horizonMonths, 24))));
  const termMonths = Math.round(asNumber(criteria.termYears, 25) * 12);

  const seriesByCode = new Map(products.series.map((s) => [s.seriesCode, s]));
  const picks = [
    ["IUMBV34", "2y fixed"],
    ["IUMBV37", "3y fixed"],
    ["IUMBV42", "5y fixed"],
    ["IUMTLMV", "revert-to-rate"],
  ] as const;

  const options = picks
    .map(([code, label]) => {
      const s = seriesByCode.get(code);
      if (!s) return null;
      const rate = latest(s);
      const pmt = monthlyPayment(principal, rate, termMonths);
      const bal = balanceAfterMonths(principal, rate, termMonths, Math.min(horizon, termMonths));
      const principalPaid = principal - bal;
      const interest = pmt * Math.min(horizon, termMonths) - principalPaid;

      const metrics: Record<string, number> = {
        monthly_payment_est: Math.round(pmt * 100) / 100,
        interest_cost_over_horizon_est: Math.round(interest * 100) / 100,
      };

      if (code === "IUMTLMV") {
        metrics.payment_if_plus_1pct = Math.round(monthlyPayment(principal, rate + 1, termMonths) * 100) / 100;
      }

      return {
        id: label.replace(/\s+/g, "-").toLowerCase(),
        label,
        rate_pct: Math.round(rate * 100) / 100,
        metrics,
      };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  return {
    category: "mortgages",
    asOf: buildAsOf(products),
    assumptions: [
      "Monthly payment uses standard amortization",
      "Term defaults to 25 years when not provided",
      "Month-end series values use the last available point in month",
    ],
    options,
    chartSeries: ["IUMBV34", "IUMBV42", "IUMTLMV"]
      .map((code) => seriesByCode.get(code))
      .filter((s): s is SeriesItem => Boolean(s))
      .map((s) => ({ label: s.label, data: s.data })),
  };
}

function buildSavingsCompare(products: ProductsResponse, criteria: Criteria): CompareResponse {
  const deposit = asNumber(criteria.deposit, 10000);
  const horizon = Math.max(1, Math.min(120, Math.round(asNumber(criteria.horizonMonths, 12))));

  const savings = products.series.find((s) => s.seriesCode === "CFMHSCV");
  const inflation = products.series.find((s) => s.seriesCode === "CPIH_YOY");
  if (!savings || !inflation) throw new Error("missing_savings_or_inflation_series");

  const savingsLastMonth = latestMonth(savings.data);
  const inflationLastMonth = latestMonth(inflation.data);
  const endMonth =
    savingsLastMonth && inflationLastMonth
      ? (savingsLastMonth < inflationLastMonth ? savingsLastMonth : inflationLastMonth)
      : undefined;

  const savingsWindow = takeLastMonths(savings.data, horizon, endMonth);
  const inflationWindow = takeLastMonths(inflation.data, horizon, endMonth);
  if (savingsWindow.length === 0 || inflationWindow.length === 0) {
    throw new Error("missing_savings_or_inflation_window");
  }

  const nominal = savingsWindow[savingsWindow.length - 1].value_pct;
  const infl = inflationWindow[inflationWindow.length - 1].value_pct;
  const projected = deposit * (1 + nominal / 100 / 12) ** horizon;

  return {
    category: "savings",
    asOf: buildAsOf(products),
    assumptions: [
      "Real rate is approximated as nominal minus CPIH YoY",
      "Projection uses simple monthly compounding",
    ],
    options: [
      {
        id: "market-average-sight-deposit",
        label: "Market-average sight deposit",
        rate_pct: Math.round(nominal * 100) / 100,
        metrics: {
          inflation_yoy_pct: Math.round(infl * 100) / 100,
          real_rate_pct: Math.round((nominal - infl) * 100) / 100,
          projected_balance_est: Math.round(projected * 100) / 100,
        },
      },
    ],
    chartSeries: [
      { label: savings.label, data: savingsWindow },
      { label: inflation.label, data: inflationWindow },
    ],
  };
}

function buildCreditCardCompare(products: ProductsResponse, criteria: Criteria): CompareResponse {
  const revolving = String(criteria.revolveBehavior || "carry-sometimes").toLowerCase().includes("carry");
  const spend = asNumber(criteria.monthlySpend, 1200);

  const lowAprScore = revolving ? 88 : 70;
  const cashbackScore = revolving ? 72 : 87;
  const balanceTransferScore = revolving ? 84 : 60;

  return {
    category: "credit-cards",
    asOf: buildAsOf(products),
    assumptions: [
      "Type-only guidance uses generalized fee/APR assumptions",
      "If revolving, APR impact is weighted higher than rewards",
    ],
    options: [
      {
        id: "low-apr",
        label: "Low APR",
        metrics: {
          fit_score: lowAprScore,
          est_annual_interest_cost: Math.round(spend * 12 * 0.03),
          est_annual_rewards_value: 40,
        },
      },
      {
        id: "balance-transfer",
        label: "Balance transfer",
        metrics: {
          fit_score: balanceTransferScore,
          est_annual_interest_cost: Math.round(spend * 12 * 0.025),
          est_annual_rewards_value: 0,
        },
      },
      {
        id: "cashback",
        label: "Cashback",
        metrics: {
          fit_score: cashbackScore,
          est_annual_interest_cost: Math.round(spend * 12 * 0.04),
          est_annual_rewards_value: Math.round(spend * 12 * 0.01),
        },
      },
    ],
    chartSeries: products.series.map((s) => ({ label: s.label, data: s.data })),
  };
}

export async function buildLiveCompare(
  category: Category,
  criteria: Criteria,
  options?: { skipCache?: boolean }
): Promise<CompareResponse> {
  const months = historyMonthsFromCriteria(criteria);
  const products = await getLiveProducts(category, undefined, {
    ...options,
    months,
  });
  const compare =
    category === "mortgages"
      ? buildMortgageCompare(products, criteria)
      : category === "savings"
        ? buildSavingsCompare(products, criteria)
        : buildCreditCardCompare(products, criteria);

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
  const sorted = [...compare.options].sort((a, b) => {
    const aCost = Number(a.metrics.interest_cost_over_horizon_est ?? a.metrics.est_annual_interest_cost ?? 0);
    const bCost = Number(b.metrics.interest_cost_over_horizon_est ?? b.metrics.est_annual_interest_cost ?? 0);
    return aCost - bCost;
  });

  const top = sorted[0] || compare.options[0];
  const second = sorted[1] || compare.options[1] || top;
  const risk = String(criteria.riskTolerance || "balanced");
  const primary = top?.label || "No recommendation";
  const alternative = second?.label || primary;

  let short = `Based on the latest market data, ${primary} is currently the strongest fit.`;
  if (category === "mortgages" && risk.includes("certainty")) {
    short = `Given your certainty preference and current spreads, ${primary} is likely the safer option.`;
  }
  if (category === "savings") {
    short = `Savings rates are best interpreted against inflation, and ${primary} currently balances return and access.`;
  }

  return {
    category,
    recommendationShort: short,
    recommendation: {
      primaryChoice: primary,
      nextBestAlternative: alternative,
      confidence: "medium",
      forecastMessage:
        category === "mortgages"
          ? "If the base rate stays elevated over the next 6-12 months, fixed options are likely to remain more predictable for monthly budgeting."
          : category === "savings"
            ? "If inflation cools faster than savings rates, real returns may improve over the next 6-12 months."
            : "If you continue carrying balances, low-APR types are likely to stay more cost-effective than rewards-focused cards.",
      keyFactors: [
        "Based on latest available BoE/ONS series",
        "Compared using deterministic, transparent assumptions",
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

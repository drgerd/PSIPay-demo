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

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
  }
  return fallback;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((item) => String(item)).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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
  const monthlySpend = Math.max(0, asNumber(criteria.monthlySpend, 1200));
  const payInFullMonthly = asBool(criteria.payInFullMonthly, true);
  const carryDebt = asBool(criteria.carryDebt, !payInFullMonthly);
  const carryDebtAmountRaw = asNumber(criteria.carryDebtAmount, monthlySpend);
  const carryDebtAmount = Math.max(0, carryDebtAmountRaw);
  const topCategories = asStringArray(criteria.topCategories).map((v) => v.toLowerCase());
  const primaryGoal = String(criteria.primaryGoal || "maximize rewards").toLowerCase();

  const annualSpend = monthlySpend * 12;
  const assumptions = {
    cashbackRate: 0.01,
    rewardsRate: 0.008,
    baseApr: 0.22,
  };
  const revolving = !payInFullMonthly || carryDebt;
  const annualInterestBaseline = revolving ? carryDebtAmount * assumptions.baseApr : 0;

  type CardModel = {
    id: string;
    label: string;
    rewardRate: number;
    annualFee: number;
    interestRelief: number;
    scoreBonus: number;
    notes: string;
  };

  const cardTypes: CardModel[] = [
    {
      id: "cashback",
      label: "Cashback",
      rewardRate: assumptions.cashbackRate,
      annualFee: 0,
      interestRelief: 0.05,
      scoreBonus: 0,
      notes: "Simple return on everyday spending.",
    },
    {
      id: "rewards-points",
      label: "Rewards / Points",
      rewardRate: assumptions.rewardsRate,
      annualFee: 0,
      interestRelief: 0.05,
      scoreBonus: 0,
      notes: "Useful if you redeem points efficiently.",
    },
    {
      id: "travel",
      label: "Travel",
      rewardRate: topCategories.includes("travel") ? 0.012 : 0.006,
      annualFee: 60,
      interestRelief: 0.05,
      scoreBonus: 0,
      notes: "Most valuable for travel-heavy spending.",
    },
    {
      id: "low-apr",
      label: "Low APR",
      rewardRate: 0.002,
      annualFee: 0,
      interestRelief: 0.45,
      scoreBonus: 0,
      notes: "Prioritizes lower interest when balances are carried.",
    },
    {
      id: "balance-transfer",
      label: "Balance Transfer",
      rewardRate: 0,
      annualFee: 25,
      interestRelief: 0.7,
      scoreBonus: 0,
      notes: "Helps reduce existing debt costs.",
    },
    {
      id: "zero-percent-purchases",
      label: "0% Purchases",
      rewardRate: 0.001,
      annualFee: 0,
      interestRelief: 0.8,
      scoreBonus: 0,
      notes: "Short-term cost control for planned spending.",
    },
  ];

  const goalBoost = (typeId: string): number => {
    if (primaryGoal.includes("interest")) {
      if (["balance-transfer", "low-apr", "zero-percent-purchases"].includes(typeId)) return 24;
      return -8;
    }
    if (primaryGoal.includes("travel")) {
      if (typeId === "travel") return 22;
      if (typeId === "rewards-points") return 8;
      return -4;
    }
    if (primaryGoal.includes("simplicity") || primaryGoal.includes("fees")) {
      if (typeId === "cashback") return 14;
      if (typeId === "low-apr") return 8;
      if (typeId === "travel") return -8;
      return 2;
    }
    // maximize rewards
    if (["cashback", "rewards-points", "travel"].includes(typeId)) return 18;
    return -8;
  };

  const categoryBoost = (typeId: string): number => {
    const hasEverydayCategories = topCategories.some((c) =>
      ["groceries", "fuel/transport", "dining", "online shopping", "general"].includes(c)
    );
    if (typeId === "travel" && topCategories.includes("travel")) return 14;
    if (typeId === "cashback" && hasEverydayCategories) return 8;
    if (typeId === "rewards-points" && hasEverydayCategories) return 6;
    return 0;
  };

  const behaviorBoost = (typeId: string): number => {
    const debtFocused = ["low-apr", "balance-transfer", "zero-percent-purchases"].includes(typeId);
    if (revolving) return debtFocused ? 28 : -18;
    return debtFocused ? -10 : 12;
  };

  const ranked = cardTypes
    .map((card) => {
      const annualRewards = annualSpend * card.rewardRate;
      const annualInterest = annualInterestBaseline * (1 - card.interestRelief);
      const annualNetValue = annualRewards - annualInterest - card.annualFee;
      const score =
        annualNetValue / 10 + behaviorBoost(card.id) + goalBoost(card.id) + categoryBoost(card.id) + card.scoreBonus;

      return {
        id: card.id,
        label: card.label,
        notes: card.notes,
        score,
        annualRewards,
        annualInterest,
        annualNetValue,
        annualFee: card.annualFee,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Hard rule: revolving users should prioritize debt-control card types.
  if (revolving) {
    const priority: Record<string, number> = {
      "balance-transfer": 3,
      "low-apr": 2,
      "zero-percent-purchases": 1,
    };
    ranked.sort((a, b) => {
      const aPriority = priority[a.id] || 0;
      const bPriority = priority[b.id] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.score - a.score;
    });
  }

  const options = ranked.slice(0, 5).map((item) => ({
    id: item.id,
    label: item.label,
    metrics: {
      score: Math.round(item.score * 10) / 10,
      estimated_annual_value: Math.round(item.annualNetValue * 100) / 100,
      estimated_annual_rewards: Math.round(item.annualRewards * 100) / 100,
      estimated_annual_interest_cost: Math.round(item.annualInterest * 100) / 100,
      assumed_annual_fee: item.annualFee,
      notes: item.notes,
    },
  }));

  return {
    category: "credit-cards",
    asOf: buildAsOf(products),
    assumptions: [
      "cashbackRate=1.0%, rewardsRate=0.8%, representativeAPR=22%",
      "estimatedAnnualRewards = monthlySpend * 12 * assumedRate",
      "estimatedAnnualInterestCost is illustrative and applies when revolving",
      "If not paid in full or debt is carried, debt-control card types are prioritized",
    ],
    options,
    chartSeries: [],
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
  const sorted =
    category === "credit-cards"
      ? [...compare.options]
      : [...compare.options].sort((a, b) => {
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
  if (category === "credit-cards") {
    short = `Based on your payment behavior and spending mix, ${primary} is the most suitable card type right now.`;
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

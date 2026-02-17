import type { CompareResponse, ProductsResponse } from "../../types/contracts";
import { asBool, asNumber, asStringArray, buildAsOf, Criteria } from "./shared";

type CardModel = {
  id: string;
  label: string;
  rewardRate: number;
  annualFee: number;
  interestRelief: number;
  scoreBonus: number;
  notes: string;
};

function goalBoost(primaryGoal: string, typeId: string): number {
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
  if (["cashback", "rewards-points", "travel"].includes(typeId)) return 18;
  return -8;
}

function categoryBoost(topCategories: string[], typeId: string): number {
  const hasEverydayCategories = topCategories.some((c) =>
    ["groceries", "fuel/transport", "dining", "online shopping", "general"].includes(c)
  );
  if (typeId === "travel" && topCategories.includes("travel")) return 14;
  if (typeId === "cashback" && hasEverydayCategories) return 8;
  if (typeId === "rewards-points" && hasEverydayCategories) return 6;
  return 0;
}

function behaviorBoost(revolving: boolean, typeId: string): number {
  const debtFocused = ["low-apr", "balance-transfer", "zero-percent-purchases"].includes(typeId);
  if (revolving) return debtFocused ? 28 : -18;
  return debtFocused ? -10 : 12;
}

function buildCardTypes(topCategories: string[]): CardModel[] {
  return [
    {
      id: "cashback",
      label: "Cashback",
      rewardRate: 0.01,
      annualFee: 0,
      interestRelief: 0.05,
      scoreBonus: 0,
      notes: "Simple return on everyday spending.",
    },
    {
      id: "rewards-points",
      label: "Rewards / Points",
      rewardRate: 0.008,
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
}

export function buildCreditCardCompare(products: ProductsResponse, criteria: Criteria): CompareResponse {
  const monthlySpend = Math.max(0, asNumber(criteria.monthlySpend, 1200));
  const payInFullMonthly = asBool(criteria.payInFullMonthly, true);
  const carryDebt = asBool(criteria.carryDebt, !payInFullMonthly);
  const carryDebtAmount = Math.max(0, asNumber(criteria.carryDebtAmount, monthlySpend));
  const topCategories = asStringArray(criteria.topCategories).map((v) => v.toLowerCase());
  const primaryGoal = String(criteria.primaryGoal || "maximize rewards").toLowerCase();

  const annualSpend = monthlySpend * 12;
  const baseApr = 0.22;
  const revolving = !payInFullMonthly || carryDebt;
  const annualInterestBaseline = revolving ? carryDebtAmount * baseApr : 0;

  const ranked = buildCardTypes(topCategories)
    .map((card) => {
      const annualRewards = annualSpend * card.rewardRate;
      const annualInterest = annualInterestBaseline * (1 - card.interestRelief);
      const annualNetValue = annualRewards - annualInterest - card.annualFee;
      const score =
        annualNetValue / 10 +
        behaviorBoost(revolving, card.id) +
        goalBoost(primaryGoal, card.id) +
        categoryBoost(topCategories, card.id) +
        card.scoreBonus;

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

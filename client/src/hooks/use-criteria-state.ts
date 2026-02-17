import { useState } from "react";
import type { Category } from "../types/api";

const defaultCriteria: Record<Category, Record<string, unknown>> = {
  mortgages: {
    loanAmount: 200000,
    ltv: 0.75,
    horizonMonths: 24,
    purpose: "remortgage",
    riskTolerance: "prefer-certainty",
  },
  savings: {
    deposit: 10000,
    horizonMonths: 12,
    access: "instant",
  },
  "credit-cards": {
    monthlySpend: 1200,
    payInFullMonthly: true,
    carryDebt: false,
    carryDebtAmount: 0,
    topCategories: ["general"],
    primaryGoal: "maximize rewards",
  },
};

export function useCriteriaState() {
  const [criteria, setCriteria] = useState<Record<Category, Record<string, unknown>>>(defaultCriteria);

  function updateCriterion(category: Category, key: string, value: unknown) {
    setCriteria((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  }

  return {
    criteria,
    updateCriterion,
  };
}

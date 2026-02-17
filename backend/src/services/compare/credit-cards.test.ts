import { describe, expect, it } from "vitest";

import { buildCreditCardCompare } from "./credit-cards";

describe("buildCreditCardCompare", () => {
  it("prioritizes debt-control card types when revolving", () => {
    const result = buildCreditCardCompare(
      {
        category: "credit-cards",
        series: [],
      },
      {
        monthlySpend: 1200,
        payInFullMonthly: false,
        carryDebt: true,
        carryDebtAmount: 3500,
        topCategories: ["general"],
        primaryGoal: "minimize interest",
      }
    );

    expect(result.options).toHaveLength(5);
    expect(result.options[0].id).toBe("balance-transfer");
    expect(result.options[1].id).toBe("low-apr");
    expect(result.options[2].id).toBe("zero-percent-purchases");
  });

  it("returns deterministic options for pay-in-full behavior", () => {
    const result = buildCreditCardCompare(
      {
        category: "credit-cards",
        series: [],
      },
      {
        monthlySpend: 900,
        payInFullMonthly: true,
        carryDebt: false,
        carryDebtAmount: 0,
        topCategories: ["travel", "dining"],
        primaryGoal: "travel benefits",
      }
    );

    expect(result.options[0].metrics.score).toBeTypeOf("number");
    expect(result.options.some((option) => option.id === "travel")).toBe(true);
  });
});

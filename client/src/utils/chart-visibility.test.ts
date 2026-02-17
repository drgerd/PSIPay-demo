import { describe, expect, it } from "vitest";

import { shouldShowCompareChart, shouldShowProductsChart } from "./chart-visibility";

describe("chart visibility", () => {
  it("hides products chart for credit cards", () => {
    expect(shouldShowProductsChart("credit-cards", false)).toBe(false);
    expect(shouldShowProductsChart("credit-cards", true)).toBe(false);
  });

  it("shows products chart for savings even when compare exists", () => {
    expect(shouldShowProductsChart("savings", true)).toBe(true);
  });

  it("shows compare chart only for mortgages with compare", () => {
    expect(shouldShowCompareChart("mortgages", true)).toBe(true);
    expect(shouldShowCompareChart("mortgages", false)).toBe(false);
    expect(shouldShowCompareChart("savings", true)).toBe(false);
  });
});

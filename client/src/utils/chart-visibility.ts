import type { Category } from "../types/api";

export function shouldShowProductsChart(category: Category, hasCompare: boolean): boolean {
  if (category === "credit-cards") return false;
  if (!hasCompare) return true;
  return category === "savings";
}

export function shouldShowCompareChart(category: Category, hasCompare: boolean): boolean {
  return category === "mortgages" && hasCompare;
}

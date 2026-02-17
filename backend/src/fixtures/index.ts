import {
  creditCardCompare,
  creditCardProducts,
  creditCardRecommendation,
} from "./creditCards";
import { mortgageCompare, mortgageProducts, mortgageRecommendation } from "./mortgages";
import { savingsCompare, savingsProducts, savingsRecommendation } from "./savings";
import type {
  Category,
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
} from "../types/contracts";

export function asCategory(value: string): Category | null {
  if (value === "mortgages" || value === "savings" || value === "credit-cards") return value;
  return null;
}

export function getFixtureProducts(category: Category): ProductsResponse {
  if (category === "mortgages") return mortgageProducts;
  if (category === "savings") return savingsProducts;
  return creditCardProducts;
}

export function getFixtureCompare(category: Category): CompareResponse {
  if (category === "mortgages") return mortgageCompare;
  if (category === "savings") return savingsCompare;
  return creditCardCompare;
}

export function getFixtureRecommendation(category: Category): RecommendationsResponse {
  if (category === "mortgages") return mortgageRecommendation;
  if (category === "savings") return savingsRecommendation;
  return creditCardRecommendation;
}

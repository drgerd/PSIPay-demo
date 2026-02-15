import { delay, http, HttpResponse } from "msw";
import type { Category, CompareRequest } from "../types/api";
import {
  creditCardCompare,
  creditCardProducts,
  creditCardRecommendation,
} from "./fixtures/creditCards";
import { mortgageCompare, mortgageProducts, mortgageRecommendation } from "./fixtures/mortgages";
import { savingsCompare, savingsProducts, savingsRecommendation } from "./fixtures/savings";

function getProducts(category: Category) {
  if (category === "mortgages") return mortgageProducts;
  if (category === "savings") return savingsProducts;
  return creditCardProducts;
}

function getCompare(category: Category) {
  if (category === "mortgages") return mortgageCompare;
  if (category === "savings") return savingsCompare;
  return creditCardCompare;
}

function getRecommendation(category: Category) {
  if (category === "mortgages") return mortgageRecommendation;
  if (category === "savings") return savingsRecommendation;
  return creditCardRecommendation;
}

export const handlers = [
  http.get("*/products/:category", async ({ params }) => {
    await delay(350);
    const category = String(params.category) as Category;
    if (!["mortgages", "savings", "credit-cards"].includes(category)) {
      return HttpResponse.json({ error: "unknown_category" }, { status: 404 });
    }
    return HttpResponse.json(getProducts(category));
  }),

  http.post("*/compare", async ({ request }) => {
    await delay(450);
    const body = (await request.json()) as CompareRequest;
    return HttpResponse.json(getCompare(body.category));
  }),

  http.post("*/recommendations", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as CompareRequest;
    return HttpResponse.json(getRecommendation(body.category));
  }),
];

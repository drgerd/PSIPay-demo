import type { CompareResponse, ProductsResponse } from "../../types/contracts";
import { asNumber, buildAsOf, Criteria, latestMonth, takeLastMonths } from "./shared";

export function buildSavingsCompare(products: ProductsResponse, criteria: Criteria): CompareResponse {
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
      {
        seriesCode: savings.seriesCode,
        label: savings.label,
        unit: savings.unit,
        asOf: savings.asOf,
        data: savingsWindow,
      },
      {
        seriesCode: inflation.seriesCode,
        label: inflation.label,
        unit: inflation.unit,
        asOf: inflation.asOf,
        data: inflationWindow,
      },
    ],
  };
}

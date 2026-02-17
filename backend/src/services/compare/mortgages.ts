import type { CompareResponse, ProductsResponse, SeriesItem } from "../../types/contracts";
import { asNumber, buildAsOf, Criteria, latest } from "./shared";

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

export function buildMortgageCompare(products: ProductsResponse, criteria: Criteria): CompareResponse {
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

import type { Category } from "../types/contracts";

type Criteria = Record<string, unknown>;

type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      errorCode: "invalid_criteria";
      message: string;
    };

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function inRange(value: number | undefined, min: number, max: number): boolean {
  return typeof value === "number" && value >= min && value <= max;
}

function validateMortgages(criteria: Criteria): ValidationResult {
  const loanAmount = readNumber(criteria.loanAmount);
  const ltv = readNumber(criteria.ltv);
  const horizonMonths = readNumber(criteria.horizonMonths);

  if (!inRange(loanAmount, 1000, 5000000)) {
    return { ok: false, errorCode: "invalid_criteria", message: "loanAmount must be between 1,000 and 5,000,000." };
  }
  if (ltv !== undefined && !inRange(ltv, 0.05, 1.2)) {
    return { ok: false, errorCode: "invalid_criteria", message: "ltv must be between 0.05 and 1.2 when provided." };
  }
  if (horizonMonths !== undefined && !inRange(horizonMonths, 1, 360)) {
    return { ok: false, errorCode: "invalid_criteria", message: "horizonMonths must be between 1 and 360." };
  }
  return { ok: true };
}

function validateSavings(criteria: Criteria): ValidationResult {
  const deposit = readNumber(criteria.deposit);
  const horizonMonths = readNumber(criteria.horizonMonths);

  if (!inRange(deposit, 1, 100000000)) {
    return { ok: false, errorCode: "invalid_criteria", message: "deposit must be between 1 and 100,000,000." };
  }
  if (horizonMonths !== undefined && !inRange(horizonMonths, 1, 360)) {
    return { ok: false, errorCode: "invalid_criteria", message: "horizonMonths must be between 1 and 360." };
  }
  return { ok: true };
}

function validateCreditCards(criteria: Criteria): ValidationResult {
  const monthlySpend = readNumber(criteria.monthlySpend);
  const carryDebtAmount = readNumber(criteria.carryDebtAmount);

  if (!inRange(monthlySpend, 0, 1000000)) {
    return { ok: false, errorCode: "invalid_criteria", message: "monthlySpend must be between 0 and 1,000,000." };
  }
  if (carryDebtAmount !== undefined && !inRange(carryDebtAmount, 0, 10000000)) {
    return {
      ok: false,
      errorCode: "invalid_criteria",
      message: "carryDebtAmount must be between 0 and 10,000,000 when provided.",
    };
  }
  return { ok: true };
}

export function validateCriteriaByCategory(category: Category, criteria: Criteria): ValidationResult {
  if (category === "mortgages") return validateMortgages(criteria);
  if (category === "savings") return validateSavings(criteria);
  return validateCreditCards(criteria);
}

type CreditCardsFormProps = {
  criteria: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

const CATEGORY_OPTIONS = [
  "groceries",
  "fuel/transport",
  "travel",
  "dining",
  "online shopping",
  "general",
] as const;

const GOAL_OPTIONS = [
  "minimize interest",
  "maximize rewards",
  "simplicity/no fees",
  "travel benefits",
] as const;

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "1"].includes(value.toLowerCase());
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

export function CreditCardsForm({
  criteria,
  onChange,
  onSubmit,
  disabled = false,
}: CreditCardsFormProps) {
  const selectedCategories = asStringArray(criteria.topCategories);
  const carryDebt = asBool(criteria.carryDebt, false);

  return (
    <>
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span>Monthly spending amount (GBP)</span>
          <input
            type="number"
            min={0}
            value={asNumber(criteria.monthlySpend, 1200)}
            onChange={(e) => onChange("monthlySpend", Number(e.target.value))}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Do you pay your balance in full each month?</span>
          <select
            value={asBool(criteria.payInFullMonthly, true) ? "yes" : "no"}
            onChange={(e) => onChange("payInFullMonthly", e.target.value === "yes")}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Do you currently carry credit card debt?</span>
          <select
            value={carryDebt ? "yes" : "no"}
            onChange={(e) => onChange("carryDebt", e.target.value === "yes")}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>

        {carryDebt && (
          <label style={{ display: "grid", gap: 4 }}>
            <span>Current carried debt amount (GBP)</span>
            <input
              type="number"
              min={0}
              value={asNumber(criteria.carryDebtAmount, asNumber(criteria.monthlySpend, 1200))}
              onChange={(e) => onChange("carryDebtAmount", Number(e.target.value))}
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
            />
          </label>
        )}

        <label style={{ display: "grid", gap: 4 }}>
          <span>Primary goal</span>
          <select
            value={String(criteria.primaryGoal || "maximize rewards")}
            onChange={(e) => onChange("primaryGoal", e.target.value)}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
          >
            {GOAL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={{ margin: "0 0 8px" }}>Top spending categories</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATEGORY_OPTIONS.map((option) => {
            const checked = selectedCategories.includes(option);
            return (
              <label key={option} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedCategories, option]
                      : selectedCategories.filter((item) => item !== option);
                    onChange("topCategories", next);
                  }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onSubmit} disabled={disabled}>
          {disabled ? "Analyzing..." : "Analyze & Recommend"}
        </button>
      </div>
    </>
  );
}

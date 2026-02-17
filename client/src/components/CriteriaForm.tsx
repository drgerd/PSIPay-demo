import type { Category } from "../types/api";

type CriteriaFormProps = {
  category: Category;
  criteria: Record<string, unknown>;
  onChange: (key: string, value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

function prettyKey(key: string): string {
  const labels: Record<string, string> = {
    loanAmount: "Loan amount",
    ltv: "LTV",
    horizonMonths: "Horizon (months)",
    purpose: "Purpose",
    riskTolerance: "Risk preference",
    deposit: "Deposit amount",
    access: "Access needs",
    monthlySpend: "Monthly spend",
    revolveBehavior: "Repayment behavior",
    preference: "Preference",
  };
  return labels[key] || key;
}

export function CriteriaForm({
  category,
  criteria,
  onChange,
  onSubmit,
  disabled = false,
}: CriteriaFormProps) {
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
        {Object.entries(criteria).map(([key, value]) => (
          <label key={`${category}-${key}`} style={{ display: "grid", gap: 4 }}>
            <span>{prettyKey(key)}</span>
            <input
              value={String(value)}
              onChange={(e) => onChange(key, e.target.value)}
              style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
            />
          </label>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onSubmit} disabled={disabled}>
          {disabled ? "Running..." : "Compare + Recommend"}
        </button>
      </div>
    </>
  );
}

import type { CompareOption } from "../types/api";

type ComparisonTableProps = {
  options: CompareOption[];
  recommendedId?: string;
  alternativeId?: string;
};

function prettyMetricName(key: string): string {
  const labels: Record<string, string> = {
    monthly_payment_est: "Estimated monthly payment",
    interest_cost_over_horizon_est: "Estimated interest over horizon",
    payment_if_plus_1pct: "Payment if rates +1%",
    inflation_yoy_pct: "Inflation (YoY)",
    real_rate_pct: "Real rate (nominal - inflation)",
    projected_balance_est: "Projected balance",
    fit_score: "Fit score",
    est_annual_interest_cost: "Estimated annual interest",
    est_annual_rewards_value: "Estimated annual rewards",
  };
  return labels[key] || key.replace(/_/g, " ");
}

function formatMetricValue(value: number | string): string {
  if (typeof value !== "number") return String(value);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ComparisonTable({ options, recommendedId, alternativeId }: ComparisonTableProps) {
  return (
    <div style={{ overflow: "auto", border: "1px solid #e5e5e5", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Option</th>
            <th style={{ textAlign: "left", padding: 8 }}>Rate %</th>
            <th style={{ textAlign: "left", padding: 8 }}>Metrics</th>
          </tr>
        </thead>
        <tbody>
          {options.map((option) => (
            <tr
              key={option.id}
              style={{
                borderTop: "1px solid #f0f0f0",
                background:
                  option.id === recommendedId
                    ? "#f3f8ff"
                    : option.id === alternativeId
                      ? "#fbfcff"
                      : "transparent",
              }}
            >
              <td style={{ padding: 8 }}>{option.label}</td>
              <td style={{ padding: 8 }}>{option.rate_pct ?? "-"}</td>
              <td style={{ padding: 8 }}>
                {Object.entries(option.metrics)
                  .map(([k, v]) => `${prettyMetricName(k)}: ${formatMetricValue(v)}`)
                  .join(" | ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { CompareOption } from "../types/api";

type ComparisonTableProps = {
  options: CompareOption[];
};

export function ComparisonTable({ options }: ComparisonTableProps) {
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
            <tr key={option.id} style={{ borderTop: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{option.label}</td>
              <td style={{ padding: 8 }}>{option.rate_pct ?? "-"}</td>
              <td style={{ padding: 8 }}>
                {Object.entries(option.metrics)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" | ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

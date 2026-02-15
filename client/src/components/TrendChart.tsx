import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartRow = Record<string, number | string>;

type TrendChartProps = {
  title: string;
  rows: ChartRow[];
  labels: string[];
  emptyText?: string;
};

const COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];

export function TrendChart({ title, rows, labels, emptyText = "No data" }: TrendChartProps) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      {rows.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <div
          style={{
            width: "100%",
            height: 280,
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            padding: 8,
          }}
        >
          <ResponsiveContainer>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {labels.map((label, idx) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={COLORS[idx % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

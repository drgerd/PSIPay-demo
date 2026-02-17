import { useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../api/config";
import { apiGet, apiPost } from "../api/http";
import { ComparisonTable } from "../components/ComparisonTable";
import { CriteriaForm } from "../components/CriteriaForm";
import { InsightsPanel } from "../components/InsightsPanel";
import { TrendChart } from "../components/TrendChart";
import type {
  Category,
  CompareRequest,
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
  SeriesItem,
} from "../types/api";

type DashboardProps = {
  config: AppConfig;
};

const defaultCriteria: Record<Category, Record<string, unknown>> = {
  mortgages: {
    loanAmount: 200000,
    ltv: 0.75,
    horizonMonths: 24,
    purpose: "remortgage",
    riskTolerance: "prefer-certainty",
  },
  savings: {
    deposit: 10000,
    horizonMonths: 12,
    access: "instant",
  },
  "credit-cards": {
    monthlySpend: 1200,
    revolveBehavior: "carry-sometimes",
    preference: "low-cost",
  },
};

function mergeSeriesForChart(series: SeriesItem[]) {
  const byMonth = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const point of s.data) {
      if (!byMonth.has(point.month)) byMonth.set(point.month, { month: point.month });
      byMonth.get(point.month)![s.label] = point.value_pct;
    }
  }
  return Array.from(byMonth.values()).sort((a, b) =>
    String(a.month).localeCompare(String(b.month))
  );
}

export function Dashboard({ config }: DashboardProps) {
  const [category, setCategory] = useState<Category>("mortgages");
  const [criteria, setCriteria] = useState<Record<Category, Record<string, unknown>>>(defaultCriteria);
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationsResponse | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const categories = useMemo(() => ["mortgages", "savings", "credit-cards"] as const, []);
  const horizonMonths = useMemo(() => {
    const raw = criteria[category]?.horizonMonths;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n)) return 12;
    return Math.max(1, Math.min(360, Math.round(n)));
  }, [category, criteria]);

  useEffect(() => {
    setError("");
    setLoadingProducts(true);
    setCompare(null);
    setRecommendation(null);
    apiGet(config.apiBaseUrl, `/products/${category}?horizonMonths=${horizonMonths}`)
      .then((res) => setProducts(res as ProductsResponse))
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingProducts(false));
  }, [category, config.apiBaseUrl, horizonMonths]);

  function updateCriterion(key: string, value: string) {
    const normalized: unknown = value !== "" && !Number.isNaN(Number(value)) ? Number(value) : value;
    setCriteria((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: normalized,
      },
    }));
  }

  async function submitCompare() {
    setError("");
    setSubmitting(true);
    try {
      const body: CompareRequest = { category, criteria: criteria[category] };
      const compareRes = (await apiPost(config.apiBaseUrl, "/compare", body)) as CompareResponse;
      setCompare(compareRes);

      const recRes = (await apiPost(
        config.apiBaseUrl,
        "/recommendations",
        body
      )) as RecommendationsResponse;
      setRecommendation(recRes);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Compare/Recommend failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const snapshotRows = products ? mergeSeriesForChart(products.series) : [];
  const compareRows = compare
    ? mergeSeriesForChart(
        compare.chartSeries.map((s) => ({
          seriesCode: s.label,
          label: s.label,
          unit: "percent",
          asOf: "",
          data: s.data,
        }))
      )
    : [];

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Psipay Dashboard</h1>
      <p style={{ marginTop: 8, color: "#444" }}>
        API: <code>{config.apiBaseUrl}</code>
      </p>

      {error && (
        <div style={{ background: "#fff4f4", border: "1px solid #e58", padding: 10, borderRadius: 6 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <label>
          Category:{" "}
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <CriteriaForm
        category={category}
        criteria={criteria[category]}
        onChange={updateCriterion}
        onSubmit={submitCompare}
        disabled={submitting || loadingProducts}
      />

      <TrendChart
        title="Market snapshot (/products)"
        rows={snapshotRows}
        labels={products?.series.map((s) => s.label) ?? []}
        emptyText={loadingProducts ? "Loading snapshot..." : "No snapshot data"}
      />

      {compare && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Comparison (/compare)</h2>
          <ComparisonTable options={compare.options} />
          <TrendChart
            title="Trend context"
            rows={compareRows}
            labels={compare.chartSeries.map((s) => s.label)}
          />
          <p style={{ marginTop: 10, color: "#444" }}>
            Assumptions: {compare.assumptions.join(" | ")}
          </p>
        </section>
      )}

      {recommendation && <InsightsPanel recommendation={recommendation} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { AppConfig } from "../api/config";
import { apiGet, apiPost } from "../api/http";
import { ComparisonTable } from "../components/ComparisonTable";
import { CriteriaForm } from "../components/CriteriaForm";
import { DeveloperDiagnostics } from "../components/DeveloperDiagnostics";
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

type RequestLog = {
  endpoint: string;
  ok: boolean;
  status: number;
  durationMs: number;
  at: string;
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
  const [requestLog, setRequestLog] = useState<RequestLog[]>([]);

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

    const started = performance.now();
    apiGet(config.apiBaseUrl, `/products/${category}?horizonMonths=${horizonMonths}`)
      .then((res) => {
        setProducts(res as ProductsResponse);
        setRequestLog((prev) => [
          {
            endpoint: `GET /products/${category}`,
            ok: true,
            status: 200,
            durationMs: Math.round(performance.now() - started),
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 12));
      })
      .catch((e) => {
        setError(String(e));
        setRequestLog((prev) => [
          {
            endpoint: `GET /products/${category}`,
            ok: false,
            status: 500,
            durationMs: Math.round(performance.now() - started),
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 12));
      })
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
      const compareStarted = performance.now();
      const compareRes = (await apiPost(config.apiBaseUrl, "/compare", body)) as CompareResponse;
      setCompare(compareRes);
      setRequestLog((prev) => [
        {
          endpoint: "POST /compare",
          ok: true,
          status: 200,
          durationMs: Math.round(performance.now() - compareStarted),
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 12));

      const recommendationStarted = performance.now();
      const recRes = (await apiPost(
        config.apiBaseUrl,
        "/recommendations",
        body
      )) as RecommendationsResponse;
      setRecommendation(recRes);
      setRequestLog((prev) => [
        {
          endpoint: "POST /recommendations",
          ok: true,
          status: 200,
          durationMs: Math.round(performance.now() - recommendationStarted),
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 12));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Compare/Recommend failed: ${message}`);
      setRequestLog((prev) => [
        {
          endpoint: "POST /compare or /recommendations",
          ok: false,
          status: 500,
          durationMs: 0,
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 12));
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

  const recommendedOption = compare?.options.find(
    (item) => item.label === recommendation?.recommendation.primaryChoice
  );
  const alternativeOption = compare?.options.find(
    (item) => item.label === recommendation?.recommendation.nextBestAlternative
  );

  const scenarioSummary = Object.entries(criteria[category] || {})
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" | ");

  return (
    <div style={{ fontFamily: "Georgia, serif", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Psipay Dashboard</h1>
      <p style={{ marginTop: 8, color: "#444" }}>Compare UK financial options with live data and AI guidance.</p>

      {error && (
        <div style={{ background: "#fff6f6", border: "1px solid #e58", padding: 10, borderRadius: 8 }}>
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

      <section
        style={{
          marginTop: 18,
          border: "1px solid #ebeef3",
          background: "#fbfdff",
          borderRadius: 10,
          padding: 10,
        }}
      >
        <strong>Current scenario:</strong> {scenarioSummary}
      </section>

      {recommendation && <InsightsPanel recommendation={recommendation} />}

      {compare && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Side-by-side comparison</h2>
          <ComparisonTable
            options={compare.options}
            recommendedId={recommendedOption?.id}
            alternativeId={alternativeOption?.id}
          />
        </section>
      )}

      <TrendChart
        title={compare ? "Trend context for your recommendation" : "Current market snapshot"}
        rows={snapshotRows}
        labels={products?.series.map((s) => s.label) ?? []}
        emptyText={loadingProducts ? "Loading snapshot..." : "No snapshot data"}
      />

      {compare && (
        <section style={{ marginTop: 24 }}>
          <TrendChart
            title="Compared options trend"
            rows={compareRows}
            labels={compare.chartSeries.map((s) => s.label)}
          />
        </section>
      )}

      <DeveloperDiagnostics
        apiBaseUrl={config.apiBaseUrl}
        category={category}
        criteria={criteria[category]}
        products={products}
        compare={compare}
        recommendation={recommendation}
        requestLog={requestLog}
      />
    </div>
  );
}

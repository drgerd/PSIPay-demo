import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api/http";
import type {
  Category,
  CompareResponse,
  ProductsResponse,
  RecommendationsResponse,
  SeriesItem,
} from "../types/api";

export type RequestLog = {
  endpoint: string;
  ok: boolean;
  status: number;
  durationMs: number;
  at: string;
};

function mergeSeriesForChart(series: SeriesItem[]) {
  const byMonth = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const point of s.data) {
      if (!byMonth.has(point.month)) byMonth.set(point.month, { month: point.month });
      byMonth.get(point.month)![s.label] = point.value_pct;
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

function addLog(
  prev: RequestLog[],
  endpoint: string,
  ok: boolean,
  status: number,
  durationMs: number
): RequestLog[] {
  return [
    {
      endpoint,
      ok,
      status,
      durationMs,
      at: new Date().toISOString(),
    },
    ...prev,
  ].slice(0, 12);
}

export function useScenarioData(args: {
  apiBaseUrl: string;
  category: Category;
  criteria: Record<Category, Record<string, unknown>>;
}) {
  const { apiBaseUrl, category, criteria } = args;
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationsResponse | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestLog, setRequestLog] = useState<RequestLog[]>([]);

  const horizonMonths = useMemo(() => {
    const raw = criteria[category]?.horizonMonths;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n)) return 12;
    return Math.max(1, Math.min(360, Math.round(n)));
  }, [category, criteria]);

  useEffect(() => {
    setError("");
    setLoadingProducts(true);
    setProducts(null);
    setCompare(null);
    setRecommendation(null);

    const started = performance.now();
    apiGet(apiBaseUrl, `/products/${category}?horizonMonths=${horizonMonths}`)
      .then((res) => {
        setProducts(res as ProductsResponse);
        setRequestLog((prev) =>
          addLog(prev, `GET /products/${category}`, true, 200, Math.round(performance.now() - started))
        );
      })
      .catch((e) => {
        setError(String(e));
        setRequestLog((prev) =>
          addLog(prev, `GET /products/${category}`, false, 500, Math.round(performance.now() - started))
        );
      })
      .finally(() => setLoadingProducts(false));
  }, [apiBaseUrl, category, horizonMonths]);

  async function submitCompareAndRecommend() {
    setError("");
    setSubmitting(true);
    try {
      const body = { category, criteria: criteria[category] };
      const started = performance.now();
      const recRes = (await apiPost(apiBaseUrl, "/recommendations", body)) as RecommendationsResponse;
      setRecommendation(recRes);
      setCompare(recRes.compare as CompareResponse);
      setRequestLog((prev) =>
        addLog(prev, "POST /recommendations", true, 200, Math.round(performance.now() - started))
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Analyze/Recommend failed: ${message}`);
      setRequestLog((prev) => addLog(prev, "POST /recommendations", false, 500, 0));
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

  return {
    products,
    compare,
    recommendation,
    loadingProducts,
    submitting,
    error,
    requestLog,
    snapshotRows,
    compareRows,
    submitCompareAndRecommend,
  };
}

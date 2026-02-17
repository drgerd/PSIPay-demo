import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api/http";
import type { Category, CompareResponse, ProductsResponse, RecommendationsResponse } from "../types/api";
import { mergeSeriesForChart } from "../utils/merge-series-for-chart";

export function useScenarioData(args: {
  apiBaseUrl: string;
  authToken?: string;
  category: Category;
  criteria: Record<Category, Record<string, unknown>>;
}) {
  const { apiBaseUrl, authToken, category, criteria } = args;
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationsResponse | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    apiGet(apiBaseUrl, `/products/${category}?horizonMonths=${horizonMonths}`, authToken)
      .then((res) => {
        setProducts(res as ProductsResponse);
      })
      .catch((e) => {
        setError(String(e));
      })
      .finally(() => setLoadingProducts(false));
  }, [apiBaseUrl, authToken, category, horizonMonths]);

  async function submitCompareAndRecommend() {
    setError("");
    setSubmitting(true);
    try {
      const body = { category, criteria: criteria[category] };
      const recRes = (await apiPost(apiBaseUrl, "/recommendations", body, authToken)) as RecommendationsResponse;
      setRecommendation(recRes);
      setCompare(recRes.compare as CompareResponse);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Analyze/Recommend failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const snapshotRows = products ? mergeSeriesForChart(products.series) : [];
  const compareRows = compare ? mergeSeriesForChart(compare.chartSeries) : [];

  return {
    products,
    compare,
    recommendation,
    loadingProducts,
    submitting,
    error,
    snapshotRows,
    compareRows,
    submitCompareAndRecommend,
  };
}

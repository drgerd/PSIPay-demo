import { useEffect, useMemo, useState } from "react";
import { ApiHttpError, apiGet } from "../api/http";
import type { Category, CompareResponse, ProductsResponse, RecommendationsResponse } from "../types/api";
import { mergeSeriesForChart } from "../utils/merge-series-for-chart";

export function useScenarioData(args: {
  apiBaseUrl: string;
  authToken?: string;
  geminiApiKeyOverride?: string;
  onUnauthorized?: () => void;
  category: Category;
  criteria: Record<Category, Record<string, unknown>>;
}) {
  const { apiBaseUrl, authToken, geminiApiKeyOverride, onUnauthorized, category, criteria } = args;
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
        if (e instanceof ApiHttpError && e.status === 401) {
          onUnauthorized?.();
          setError("Your session expired. Please sign in again.");
          return;
        }
        setError(String(e));
      })
      .finally(() => setLoadingProducts(false));
  }, [apiBaseUrl, authToken, onUnauthorized, category, horizonMonths]);

  async function submitCompareAndRecommend() {
    setError("");
    setSubmitting(true);
    try {
      const criteriaJson = encodeURIComponent(JSON.stringify(criteria[category] || {}));
      const path = `/recommendations?category=${encodeURIComponent(category)}&criteria=${criteriaJson}`;
      const recRes = (await apiGet(apiBaseUrl, path, authToken, {
        ...(geminiApiKeyOverride ? { "x-gemini-api-key": geminiApiKeyOverride } : {}),
      })) as RecommendationsResponse;
      setRecommendation(recRes);
      setCompare(recRes.compare as CompareResponse);
    } catch (e) {
      if (e instanceof ApiHttpError && e.status === 401) {
        onUnauthorized?.();
        setError("Your session expired. Please sign in again.");
        return;
      }
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

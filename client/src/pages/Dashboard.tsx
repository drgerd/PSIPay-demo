import { useMemo, useState } from "react";
import type { AppConfig } from "../api/config";
import { ComparisonTable } from "../components/ComparisonTable";
import { CriteriaForm } from "../components/CriteriaForm";
import { CreditCardsForm } from "../components/CreditCardsForm";
import { InsightsPanel } from "../components/InsightsPanel";
import { TrendChart } from "../components/TrendChart";
import { useCriteriaState } from "../hooks/use-criteria-state";
import { useScenarioData } from "../hooks/use-scenario-data";
import type { Category } from "../types/api";
import { shouldShowCompareChart, shouldShowProductsChart } from "../utils/chart-visibility";

type DashboardProps = {
  config: AppConfig;
  authToken?: string;
  onLogout?: () => void;
};

export function Dashboard({ config, authToken, onLogout }: DashboardProps) {
  const [category, setCategory] = useState<Category>("mortgages");
  const categories = useMemo(() => ["mortgages", "savings", "credit-cards"] as const, []);
  const { criteria, updateCriterion } = useCriteriaState();

  const {
    products,
    compare,
    recommendation,
    loadingProducts,
    submitting,
    error,
    snapshotRows,
    compareRows,
    submitCompareAndRecommend,
  } = useScenarioData({
    apiBaseUrl: config.apiBaseUrl,
    authToken,
    category,
    criteria,
  });

  const recommendedOption = compare?.options.find((item) => item.label === recommendation?.recommendation.primaryChoice);
  const alternativeOption = compare?.options.find(
    (item) => item.label === recommendation?.recommendation.nextBestAlternative
  );

  const hasCompare = Boolean(compare);
  const showProductsChart = shouldShowProductsChart(category, hasCompare);
  const showCompareChart = shouldShowCompareChart(category, hasCompare);
  const safeProducts = products?.category === category ? products : null;

  const scenarioSummary = Object.entries(criteria[category] || {})
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" | ");

  return (
    <div style={{ fontFamily: "Georgia, serif", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Psipay Dashboard</h1>
        {onLogout && (
          <button onClick={onLogout} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Log out
          </button>
        )}
      </div>
      <p style={{ marginTop: 8, color: "#444" }}>Compare UK financial options with live data and AI guidance.</p>

      {error && (
        <div style={{ background: "#fff6f6", border: "1px solid #e58", padding: 10, borderRadius: 8 }}>{error}</div>
      )}

      {submitting && (
        <div
          style={{
            marginTop: 10,
            background: "#eef5ff",
            border: "1px solid #a6c4ff",
            padding: 10,
            borderRadius: 8,
          }}
        >
          Analyzing your scenario and preparing recommendation...
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

      {category === "credit-cards" ? (
        <CreditCardsForm
          criteria={criteria[category]}
          onChange={(key, value) => updateCriterion(category, key, value)}
          onSubmit={submitCompareAndRecommend}
          disabled={submitting || loadingProducts}
        />
      ) : (
        <CriteriaForm
          category={category}
          criteria={criteria[category]}
          onChange={(key, value) => updateCriterion(category, key, value)}
          onSubmit={submitCompareAndRecommend}
          disabled={submitting || loadingProducts}
        />
      )}

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

      {showProductsChart && (
        <TrendChart
          title={
            category === "savings"
              ? "Savings vs inflation trend"
              : hasCompare
                ? "Trend context for your recommendation"
                : "Current market snapshot"
          }
          rows={snapshotRows}
          labels={safeProducts?.series.map((s) => s.label) ?? []}
          emptyText={loadingProducts ? "Loading snapshot..." : "No snapshot data"}
        />
      )}

      {category === "credit-cards" && compare && (
        <section style={{ marginTop: 18, border: "1px solid #ebeef3", borderRadius: 10, padding: 12 }}>
          <strong>What-if:</strong> If you move to paying your balance in full, reward-focused card types typically
          become more attractive than debt-control types.
        </section>
      )}

      {showCompareChart && compare && (
        <section style={{ marginTop: 24 }}>
          <TrendChart title="Compared options trend" rows={compareRows} labels={compare.chartSeries.map((s) => s.label)} />

          {snapshotRows.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>Full market snapshot (advanced)</summary>
              <TrendChart
                title="Full mortgage market context"
                rows={snapshotRows}
                labels={safeProducts?.series.map((s) => s.label) ?? []}
              />
            </details>
          )}
        </section>
      )}

    </div>
  );
}

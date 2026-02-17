import type { RecommendationsResponse } from "../types/api";

type InsightsPanelProps = {
  recommendation: RecommendationsResponse;
};

export function InsightsPanel({ recommendation }: InsightsPanelProps) {
  return (
    <section style={{ marginTop: 24, border: "1px solid #e5e5e5", borderRadius: 8, padding: 12 }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>AI Insights (/recommendations)</h2>
      <p style={{ margin: "0 0 8px" }}>{recommendation.recommendationShort}</p>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Primary:</strong> {recommendation.recommendation.primaryChoice} | <strong>Confidence:</strong>{" "}
        {recommendation.recommendation.confidence}
      </p>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Key factors:</strong> {recommendation.recommendation.keyFactors.join(" | ")}
      </p>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Tradeoffs:</strong> {recommendation.recommendation.tradeoffs.join(" | ")}
      </p>
      <p style={{ margin: "0 0 8px" }}>
        <strong>What would change:</strong> {recommendation.recommendation.whatWouldChange.join(" | ")}
      </p>
      <p style={{ margin: 0, color: "#555" }}>
        {recommendation.disclaimer} {recommendation.dataFreshnessNote}
      </p>
      {recommendation.ai && (
        <p style={{ marginTop: 8, marginBottom: 0, color: "#555" }}>
          AI: {recommendation.ai.used ? "enabled" : "fallback"}
          {recommendation.ai.model ? ` (${recommendation.ai.model})` : ""}
          {recommendation.ai.reason ? ` - ${recommendation.ai.reason}` : ""}
        </p>
      )}
    </section>
  );
}

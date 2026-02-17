import type { RecommendationsResponse } from "../types/api";

type InsightsPanelProps = {
  recommendation: RecommendationsResponse;
};

export function InsightsPanel({ recommendation }: InsightsPanelProps) {
  const rec = recommendation.recommendation;

  return (
    <section
      style={{
        marginTop: 24,
        border: "1px solid #d9dde8",
        background: "linear-gradient(180deg, #f9fbff 0%, #ffffff 100%)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 6 }}>Recommended direction</h2>
      <p style={{ margin: "0 0 10px", fontSize: 16 }}>{recommendation.recommendationShort}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ background: "#eef4ff", borderRadius: 999, padding: "6px 10px" }}>
          Best fit: <strong>{rec.primaryChoice}</strong>
        </div>
        <div style={{ background: "#f3f6f9", borderRadius: 999, padding: "6px 10px" }}>
          Alternative: <strong>{rec.nextBestAlternative}</strong>
        </div>
        <div style={{ background: "#f3f6f9", borderRadius: 999, padding: "6px 10px" }}>
          Confidence: <strong>{rec.confidence}</strong>
        </div>
        <div style={{ background: "#f3f6f9", borderRadius: 999, padding: "6px 10px" }}>
          AI: <strong>{recommendation.ai?.used ? `enabled (${recommendation.ai.model || "model"})` : "fallback"}</strong>
        </div>
      </div>

      {!recommendation.ai?.used && recommendation.ai?.reason && (
        <p style={{ margin: "0 0 10px", color: "#6a4f00", background: "#fff9e6", padding: "8px 10px", borderRadius: 8 }}>
          AI explanation unavailable right now ({recommendation.ai.reason}). Showing deterministic guidance.
        </p>
      )}

      <p style={{ margin: "0 0 10px" }}>
        <strong>Forecast:</strong> {rec.forecastMessage}
      </p>

      <p style={{ margin: "0 0 6px" }}>
        <strong>Why this fits:</strong> {rec.keyFactors.join(" | ")}
      </p>
      <p style={{ margin: "0 0 6px" }}>
        <strong>Tradeoffs:</strong> {rec.tradeoffs.join(" | ")}
      </p>
      <p style={{ margin: "0 0 6px" }}>
        <strong>What could change this:</strong> {rec.whatWouldChange.join(" | ")}
      </p>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Suggested next steps:</strong> {rec.actionChecklist.join(" | ")}
      </p>

      <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
        {recommendation.disclaimer} {recommendation.dataFreshnessNote}
      </p>
    </section>
  );
}

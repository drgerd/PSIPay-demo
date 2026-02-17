import type { Category, CompareResponse, ProductsResponse, RecommendationsResponse } from "../types/api";

type RequestLog = {
  endpoint: string;
  ok: boolean;
  status: number;
  durationMs: number;
  at: string;
};

type DeveloperDiagnosticsProps = {
  apiBaseUrl: string;
  category: Category;
  criteria: Record<string, unknown>;
  products: ProductsResponse | null;
  compare: CompareResponse | null;
  recommendation: RecommendationsResponse | null;
  requestLog: RequestLog[];
};

export function DeveloperDiagnostics({
  apiBaseUrl,
  category,
  criteria,
  products,
  compare,
  recommendation,
  requestLog,
}: DeveloperDiagnosticsProps) {
  return (
    <details style={{ marginTop: 24, border: "1px solid #d9dde8", borderRadius: 10, padding: 12 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Developer diagnostics</summary>
      <div style={{ marginTop: 10, display: "grid", gap: 8, fontSize: 13 }}>
        <div>
          <strong>API:</strong> {apiBaseUrl}
        </div>
        <div>
          <strong>Category:</strong> {category}
        </div>
        <div>
          <strong>Criteria:</strong> <code>{JSON.stringify(criteria)}</code>
        </div>
        <div>
          <strong>Request log:</strong>
          <ul style={{ marginTop: 6 }}>
            {requestLog.map((item) => (
              <li key={`${item.at}-${item.endpoint}`}>
                {item.endpoint} - {item.status} - {item.durationMs}ms - {item.ok ? "ok" : "error"}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Data freshness:</strong> products stale={String(products?.stale ?? false)}, compare stale=
          {String(compare?.stale ?? false)}
        </div>
        <div>
          <strong>As-of map:</strong> <code>{JSON.stringify(compare?.asOf || products?.series || null)}</code>
        </div>
        <div>
          <strong>AI meta:</strong> <code>{JSON.stringify(recommendation?.ai || null)}</code>
        </div>
        <div>
          <strong>Gemini prompt:</strong>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8f9fb", padding: 8, borderRadius: 8 }}>
            {recommendation?.ai?.debug?.requestPrompt || "(empty)"}
          </pre>
        </div>
        <div>
          <strong>Gemini raw response:</strong>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8f9fb", padding: 8, borderRadius: 8 }}>
            {recommendation?.ai?.debug?.rawResponse || "(empty)"}
          </pre>
        </div>
        <div>
          <strong>Gemini parsed response:</strong>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8f9fb", padding: 8, borderRadius: 8 }}>
            {JSON.stringify(recommendation?.ai?.debug?.parsedResponse || null, null, 2)}
          </pre>
        </div>
        <div>
          <strong>Gemini errors:</strong>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8f9fb", padding: 8, borderRadius: 8 }}>
            {JSON.stringify(recommendation?.ai?.debug?.errors || [], null, 2)}
          </pre>
        </div>
        <div>
          <strong>Assumptions:</strong> <code>{JSON.stringify(compare?.assumptions || [])}</code>
        </div>
      </div>
    </details>
  );
}

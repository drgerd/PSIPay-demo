import type { ProductsResponse, SeriesItem, SeriesPoint } from "../../types/contracts";

export type Criteria = Record<string, unknown>;

export function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
  }
  return fallback;
}

export function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((item) => String(item)).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function historyMonthsFromCriteria(criteria: Criteria): number {
  const fallback = Number(process.env.DEFAULT_HISTORY_MONTHS || "12");
  const parsed = Math.round(asNumber(criteria.horizonMonths, fallback));
  return Math.max(1, Math.min(360, parsed));
}

export function latest(series: SeriesItem): number {
  const p = series.data[series.data.length - 1];
  return p?.value_pct ?? 0;
}

export function latestMonth(points: SeriesPoint[]): string | null {
  return points.length ? points[points.length - 1].month : null;
}

export function takeLastMonths(points: SeriesPoint[], months: number, endMonth?: string): SeriesPoint[] {
  const filtered = endMonth ? points.filter((p) => p.month <= endMonth) : points;
  if (filtered.length <= months) return filtered;
  return filtered.slice(filtered.length - months);
}

export function buildAsOf(products: ProductsResponse): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of products.series) out[s.seriesCode] = s.asOf;
  return out;
}

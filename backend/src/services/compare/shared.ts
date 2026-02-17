import type { ProductsResponse, SeriesItem, SeriesPoint } from "../../types/contracts";
import { asBool, asNumber, asStringArray } from "../../utils/coerce";

export type Criteria = Record<string, unknown>;
export { asBool, asNumber, asStringArray };

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

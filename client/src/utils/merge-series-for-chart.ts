import type { SeriesItem } from "../types/api";

export function mergeSeriesForChart(series: SeriesItem[]): Array<Record<string, number | string>> {
  const byMonth = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const point of s.data) {
      if (!byMonth.has(point.month)) byMonth.set(point.month, { month: point.month });
      byMonth.get(point.month)![s.label] = point.value_pct;
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

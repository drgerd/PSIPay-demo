import { fetchBoeSeries } from "../data/boe";
import { fetchOnsCpihYoY } from "../data/ons";
import type { Category, ProductsResponse } from "../types/contracts";

function takeLastMonths<T>(items: T[], months: number): T[] {
  if (items.length <= months) return items;
  return items.slice(items.length - months);
}

function parseDateInput(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function monthSeries(base = 50, slope = 0.2): Array<{ month: string; value_pct: number }> {
  const out: Array<{ month: string; value_pct: number }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ month, value_pct: Math.round((base + (11 - i) * slope) * 100) / 100 });
  }
  return out;
}

export async function getLiveProducts(
  category: Category,
  query?: { from?: string; to?: string },
  options?: { skipCache?: boolean; months?: number }
): Promise<ProductsResponse> {
  const from = parseDateInput(query?.from);
  const to = parseDateInput(query?.to);
  const months = Math.max(1, Math.round(options?.months ?? Number(process.env.DEFAULT_HISTORY_MONTHS || "12")));
  const fetchMonths = months + 3;

  if (category === "mortgages") {
    const { series, stale } = await fetchBoeSeries(
      ["IUMBV34", "IUMBV37", "IUMBV42", "IUMTLMV", "IUMBEDR"],
      {
        from,
        to,
        months: fetchMonths,
        skipCache: options?.skipCache,
      }
    );
    const trimmed = series.map((s) => ({ ...s, data: takeLastMonths(s.data, months) }));
    return { category, series: trimmed, ...(stale ? { stale: true } : {}) };
  }

  if (category === "savings") {
    const boe = await fetchBoeSeries(["CFMHSCV"], {
      from,
      to,
      months: fetchMonths,
      skipCache: options?.skipCache,
    });
    const ons = await fetchOnsCpihYoY({
      from,
      to,
      months: fetchMonths,
      skipCache: options?.skipCache,
    });
    const savings = boe.series[0];
    if (!savings) throw new Error("boe_missing_savings_series");
    const stale = boe.stale || ons.stale;
    const savingsTrimmed = { ...savings, data: takeLastMonths(savings.data, months) };
    const onsTrimmed = { ...ons.series, data: takeLastMonths(ons.series.data, months) };
    return {
      category,
      series: [savingsTrimmed, onsTrimmed],
      ...(stale ? { stale: true } : {}),
    };
  }

  return {
    category,
    stale: false,
    series: [
      {
        seriesCode: "CARD_TYPE_SCORE",
        label: "type-fit index",
        unit: "percent",
        asOf: new Date().toISOString(),
        data: monthSeries(),
      },
    ],
  };
}

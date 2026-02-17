import type { SeriesItem, SeriesPoint } from "../types/contracts";
import { cachedFetchJson } from "../services/dynamoCache";
import { fetchWithRetry } from "./fetch-with-retry";

const BOE_LABELS: Record<string, string> = {
  IUMBV34: "2y fixed",
  IUMBV37: "3y fixed",
  IUMBV42: "5y fixed",
  IUMTLMV: "revert-to-rate",
  IUMBEDR: "base rate",
  CFMHSCV: "household sight deposits rate",
};

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

type RowValue = {
  at: string;
  value: number;
};

function formatBoeDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = Object.keys(MONTHS)[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseBoeDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const mm = MONTHS[m[2]];
  const year = Number(m[3]);
  if (!Number.isFinite(day) || mm == null || !Number.isFinite(year)) return null;
  return new Date(Date.UTC(year, mm, day));
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((c) => c.trim()));
}

function defaultRange(months = 12): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - (months - 1), 1));
  return { from, to };
}

export async function fetchBoeSeries(
  seriesCodes: string[],
  options?: { from?: Date; to?: Date; months?: number }
): Promise<{ series: SeriesItem[]; stale: boolean }> {
  const baseUrl =
    process.env.BOE_BASE_URL ||
    "https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp";

  const fallback = defaultRange(options?.months ?? Number(process.env.DEFAULT_HISTORY_MONTHS || "12"));
  const from = options?.from || fallback.from;
  const to = options?.to || fallback.to;

  const params = new URLSearchParams({
    "csv.x": "yes",
    Datefrom: formatBoeDate(from),
    Dateto: formatBoeDate(to),
    SeriesCodes: seriesCodes.join(","),
    CSVF: "TN",
    UsingCodes: "Y",
    VPD: "Y",
    VFD: "N",
  });

  const url = `${baseUrl}?${params.toString()}`;

  const { value: cached, stale } = await cachedFetchJson<{ series: SeriesItem[]; asOf: string }>({
    cacheKey: `boe:${url}`,
    ttlSeconds: 24 * 60 * 60,
    fetchFresh: async () => {
      const res = await fetchWithRetry(url, undefined, { requestName: "boe_series_fetch" });
      if (!res.ok) throw new Error(`boe_fetch_failed:${res.status}`);

      const csv = await res.text();
      const rows = parseCsv(csv);
      if (rows.length < 2) throw new Error("boe_empty_response");

      const header = rows[0];
      const dateCol = header.findIndex((h) => h.toUpperCase() === "DATE");
      if (dateCol === -1) throw new Error("boe_invalid_header");

      const wantedCols: Array<{ idx: number; code: string }> = [];
      for (const code of seriesCodes) {
        const idx = header.findIndex((h) => h === code);
        if (idx >= 0) wantedCols.push({ idx, code });
      }
      if (wantedCols.length === 0) throw new Error("boe_missing_series_columns");

      const grouped: Record<string, Map<string, RowValue>> = {};
      for (const { code } of wantedCols) grouped[code] = new Map<string, RowValue>();

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const date = parseBoeDate(row[dateCol] || "");
        if (!date) continue;
        const mk = monthKey(date);
        const at = date.toISOString();

        for (const { idx, code } of wantedCols) {
          const raw = row[idx];
          const value = Number.parseFloat(raw);
          if (!Number.isFinite(value)) continue;

          const current = grouped[code].get(mk);
          if (!current || current.at < at) grouped[code].set(mk, { at, value });
        }
      }

      const asOf = new Date().toISOString();
      return {
        asOf,
        series: wantedCols.map(({ code }) => {
          const data: SeriesPoint[] = Array.from(grouped[code].entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, point]) => ({
              month,
              value_pct: Math.round(point.value * 100) / 100,
            }));

          return {
            seriesCode: code,
            label: BOE_LABELS[code] || code,
            unit: "percent",
            asOf,
            data,
          };
        }),
      };
    },
  });

  // Ensure stable shape even if cache payload changes later.
  return { series: cached.series, stale };
}

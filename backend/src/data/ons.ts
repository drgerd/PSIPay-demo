import type { SeriesItem } from "../types/contracts";
import { cachedFetchJson } from "../services/dynamoCache";

const MMM_TO_MM: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

type OnsObservation = {
  dimensions?: { Time?: { id?: string } };
  observation?: string;
};

function monthFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function defaultFromMonth(months: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return monthFromDate(d);
}

function parseMonthId(timeId: string): string | null {
  const m = /^([A-Za-z]{3})-(\d{2})$/.exec(timeId.trim());
  if (!m) return null;
  const mm = MMM_TO_MM[m[1]];
  if (!mm) return null;
  const yy = Number(m[2]);
  if (!Number.isFinite(yy)) return null;
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${String(year).padStart(4, "0")}-${mm}`;
}

function prevYearMonth(month: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(y) || mm < 1 || mm > 12) return null;
  return `${String(y - 1).padStart(4, "0")}-${String(mm).padStart(2, "0")}`;
}

export async function fetchOnsCpihYoY(options?: {
  from?: Date;
  to?: Date;
  months?: number;
}): Promise<{ series: SeriesItem; stale: boolean }> {
  const version = process.env.ONS_CPIH_VERSION || "66";
  const url =
    `https://api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/${version}/observations` +
    "?time=*&geography=K02000001&aggregate=CP00";

  const { value: cached, stale } = await cachedFetchJson<{ asOf: string; series: SeriesItem }>({
    cacheKey: `ons:${url}`,
    ttlSeconds: 7 * 24 * 60 * 60,
    fetchFresh: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ons_fetch_failed:${res.status}`);

      const payload = (await res.json()) as { observations?: OnsObservation[] };
      const observations = payload.observations;
      if (!Array.isArray(observations) || observations.length === 0) {
        throw new Error("ons_empty_response");
      }

      const indexMap = new Map<string, number>();
      for (const obs of observations) {
        const id = obs.dimensions?.Time?.id;
        if (!id) continue;
        const month = parseMonthId(id);
        if (!month) continue;
        const idx = Number.parseFloat(String(obs.observation ?? ""));
        if (!Number.isFinite(idx)) continue;
        indexMap.set(month, idx);
      }

      const months = Array.from(indexMap.keys()).sort((a, b) => a.localeCompare(b));
      const data: Array<{ month: string; value_pct: number }> = [];

      for (const month of months) {
        const prev = prevYearMonth(month);
        if (!prev) continue;
        const curIdx = indexMap.get(month);
        const prevIdx = indexMap.get(prev);
        if (!Number.isFinite(curIdx) || !Number.isFinite(prevIdx) || (prevIdx as number) === 0) continue;

        const yoy = (((curIdx as number) / (prevIdx as number)) - 1) * 100;
        data.push({ month, value_pct: Math.round(yoy * 100) / 100 });
      }

      const asOf = new Date().toISOString();
      return {
        asOf,
        series: {
          seriesCode: "CPIH_YOY",
          label: "CPIH YoY",
          unit: "percent",
          asOf,
          data,
        },
      };
    },
  });

  const months = options?.months ?? Number(process.env.DEFAULT_HISTORY_MONTHS || "12");
  const fromMonth = options?.from ? monthFromDate(options.from) : defaultFromMonth(months);
  const toMonth = options?.to ? monthFromDate(options.to) : "9999-12";

  const filtered = cached.series.data.filter((p) => p.month >= fromMonth && p.month <= toMonth);

  return {
    series: {
      ...cached.series,
      data: filtered,
    },
    stale,
  };
}

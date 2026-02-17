import { describe, expect, it } from "vitest";

import { mergeSeriesForChart } from "./merge-series-for-chart";

describe("mergeSeriesForChart", () => {
  it("merges multiple series by month", () => {
    const rows = mergeSeriesForChart([
      {
        seriesCode: "S1",
        label: "Series A",
        unit: "percent",
        asOf: "2026-01-01T00:00:00Z",
        data: [
          { month: "2026-01", value_pct: 1.1 },
          { month: "2026-02", value_pct: 1.2 },
        ],
      },
      {
        seriesCode: "S2",
        label: "Series B",
        unit: "percent",
        asOf: "2026-01-01T00:00:00Z",
        data: [
          { month: "2026-01", value_pct: 2.1 },
          { month: "2026-02", value_pct: 2.2 },
        ],
      },
    ]);

    expect(rows).toEqual([
      { month: "2026-01", "Series A": 1.1, "Series B": 2.1 },
      { month: "2026-02", "Series A": 1.2, "Series B": 2.2 },
    ]);
  });
});

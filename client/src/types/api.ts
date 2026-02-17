export type Category = "mortgages" | "savings" | "credit-cards";

export type SeriesPoint = {
  month: string;
  value_pct: number;
};

export type SeriesItem = {
  seriesCode: string;
  label: string;
  unit: "percent";
  asOf: string;
  data: SeriesPoint[];
};

export type ProductsResponse = {
  category: Category;
  stale?: boolean;
  series: SeriesItem[];
};

export type CompareRequest = {
  category: Category;
  criteria: Record<string, unknown>;
};

export type CompareOption = {
  id: string;
  label: string;
  rate_pct?: number;
  metrics: Record<string, number | string>;
};

export type CompareChartSeries = {
  seriesCode: string;
  label: string;
  unit: "percent";
  asOf: string;
  data: SeriesPoint[];
};

export type CompareResponse = {
  category: Category;
  stale?: boolean;
  asOf: Record<string, string>;
  assumptions: string[];
  options: CompareOption[];
  chartSeries: CompareChartSeries[];
};

export type RecommendationsResponse = {
  category: Category;
  recommendationShort: string;
  recommendation: {
    primaryChoice: string;
    nextBestAlternative: string;
    confidence: "low" | "medium" | "high";
    forecastMessage: string;
    keyFactors: string[];
    tradeoffs: string[];
    whatWouldChange: string[];
    actionChecklist: string[];
  };
  disclaimer: string;
  dataFreshnessNote: string;
  ai?: {
    used: boolean;
    fallback: boolean;
    model?: string;
    reason?: string;
  };
  compare: CompareResponse;
};

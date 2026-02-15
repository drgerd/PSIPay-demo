# Skills - Data Sources (BoE + ONS CPIH)

This document captures the implementation rules for fetching and normalizing:
- Bank of England (BoE) time series (CSV)
- ONS CPIH index (JSON) and computing YoY inflation (%)

The goal is to produce stable, testable, normalized monthly series that feed:
- charts (12-month history)
- deterministic comparisons
- Gemini prompts (AI must not invent numbers)

## 1) Bank of England (BoE) - CSV Time Series

### 1.1 Typical BoE CSV endpoint

Example (mortgage fixed rates):

```
https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?
csv.x=yes&Datefrom=01/Jan/2024&Dateto=01/Jan/2026&
SeriesCodes=IUMBV34,IUMBV37,IUMBV42&
CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N
```

Other BoE pages also expose CSV with different query params (e.g. `/boeapps/database/fromshowcolumns.asp?...`).
Implementation should:
- treat the base URL as configurable (`BOE_BASE_URL`)
- only rely on the CSV output, not the HTML page

### 1.2 Series codes used (MVP)

Mortgages:
- `IUMBV34` 2y fixed
- `IUMBV37` 3y fixed
- `IUMBV42` 5y fixed
- `IUMTLMV` revert-to-rate (used as variable proxy)
- `IUMBEDR` base rate

Savings:
- `CFMHSCV` Monthly average weighted average interest rate on interest-bearing sight deposits from households (%), NSA

### 1.3 CSV parsing rules

BoE CSV is not guaranteed to be consistent across pages/params. Make parsing tolerant:
- treat values as strings; parse float only after trimming
- ignore blank rows
- allow extra header/comment rows
- validate that at least 1 observation exists

Normalized output (per point):

```
{ month: "YYYY-MM", value_pct: number, seriesCode: string, source: "BoE", asOf: "ISO timestamp" }
```

### 1.4 Time normalization (month-end rule)

Some series may return daily or irregular dates.

Rule: normalize to `YYYY-MM` and keep the month-end value:
- group observations by `YYYY-MM`
- within each month, select the observation with the latest date

This keeps charts consistent across sources and avoids mixing frequencies.

### 1.5 Cache guidance

Cache key should include:
- base URL (or source identifier)
- seriesCodes
- from/to dates

TTL (suggestion): 24 hours.

## 2) ONS CPIH - Index and YoY Inflation %

### 2.1 Data source

Fetch CPIH index observations (full history):

```
GET https://api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/{ONS_CPIH_VERSION}/observations?time=*&geography=K02000001&aggregate=CP00
```

Params meaning:
- dataset: `cpih01`
- edition: `time-series`
- version: env-configurable `ONS_CPIH_VERSION` (default 66)
- geography: `K02000001` (UK)
- aggregate: `CP00` (overall CPIH index)
- time: `*` (all)

Expected structure (simplified):

```
{
  "observations": [
    {
      "dimensions": { "Time": { "id": "Mar-25" } },
      "observation": "136.1"
    }
  ]
}
```

### 2.2 Normalize CPIH index series

Steps:
1) Extract
   - `timeId = obs.dimensions.Time.id` (format `MMM-YY`)
   - `indexValue = parseFloat(obs.observation)`
2) Convert time `MMM-YY` -> `YYYY-MM`
   - `MMM` -> `01..12`
   - `YY` -> `20YY`
3) Filter invalid entries (bad date, NaN index)
4) Sort ascending by month
5) Deduplicate months if needed (keep last)

Normalized index series output:

```
[{ month: "2024-03", index: 131.6 }, ...]
```

### 2.3 Compute YoY inflation (%)

Formula:

```
YoY% = (Index(t) / Index(t-12) - 1) * 100
```

Rules:
- do not assume API order; always sort
- create a lookup `month -> index`
- for each month, compute YoY only if `t-12` exists
- round to 2 decimals
- skip first 12 months or any month missing a prior-year match

Output:

```
[
  { month: "2025-03", inflation_yoy_pct: 3.42 },
  ...
]
```

Required return shape:

```
{ source: "ONS CPIH", unit: "YoY %", data: inflationSeries }
```

### 2.4 Cache guidance

Cache key must include:
- dataset=cpih01
- edition=time-series
- version
- geography=K02000001
- aggregate=CP00
- time=*

TTL (suggestion): 7 days.

### 2.5 Failure behavior

If ONS fails:
- log the error (include URL and status)
- return a structured error payload from the API layer
- do not crash the Lambda

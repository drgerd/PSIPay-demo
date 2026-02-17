# API Contracts (MVP)

All responses include:
- `asOf` timestamps per source/series when possible
- `stale` boolean when returning cached data due to upstream failure

## 1) GET `/products/{category}`

Query params:
- `from` (optional, `YYYY-MM-DD`)
- `to` (optional, `YYYY-MM-DD`)
- `horizonMonths` (optional, integer, default `12`)

Behavior:
- default window: last 12 months
- normalize points to `YYYY-MM` month and use month-end (last available point in month)
- if `horizonMonths` is provided, return up to that many months (subject to source availability)

Example response (shape):

```json
{
  "category": "mortgages",
  "series": [
    {
      "seriesCode": "IUMBV34",
      "label": "2y fixed",
      "unit": "percent",
      "asOf": "2026-02-15T10:00:00Z",
      "data": [{ "month": "2025-03", "value_pct": 4.85 }]
    }
  ]
}
```

## 2) POST `/compare`

Request:

```json
{
  "category": "mortgages",
  "criteria": {
    "loanAmount": 200000,
    "ltv": 0.75,
    "horizonMonths": 24,
    "purpose": "remortgage",
    "riskTolerance": "prefer-certainty"
  }
}
```

Response (shape):

```json
{
  "category": "mortgages",
  "asOf": {
    "BoE": "2026-02-15T10:00:00Z"
  },
  "assumptions": [
    "Monthly payment uses standard amortization",
    "Month-end series value uses last available point in month"
  ],
  "options": [
    {
      "id": "2y-fixed",
      "label": "2y fixed",
      "rate_pct": 4.85,
      "metrics": {
        "monthly_payment_est": 1145.23,
        "interest_cost_over_horizon_est": 19234.11
      }
    }
  ],
  "chartSeries": [
    {
      "label": "2y fixed",
      "data": [{ "month": "2025-03", "value_pct": 4.85 }]
    }
  ]
}
```

## 3) `/recommendations`

Supports both:
- `POST /recommendations` with body (same as `/compare`)
- `GET /recommendations?category=<category>&criteria=<url-encoded-json>`

Response: deterministic compare output + AI payload.

```json
{
  "category": "mortgages",
  "recommendationShort": "Based on current spreads and your preference for certainty, a fixed rate is the safer fit today.",
  "recommendation": {
    "primaryChoice": "5y fixed",
    "nextBestAlternative": "2y fixed",
    "confidence": "medium",
    "forecastMessage": "If rates stay elevated over the next 6-12 months, fixed terms are likely to remain more predictable.",
    "keyFactors": ["..."],
    "tradeoffs": ["..."],
    "whatWouldChange": ["..."],
    "actionChecklist": ["..."]
  },
  "disclaimer": "Educational, not financial advice.",
  "dataFreshnessNote": "BoE data as-of 2026-02-15.",
  "ai": {
    "used": true,
    "fallback": false,
    "model": "gemini-1.5-flash-latest"
  },
  "compare": { "...": "deterministic payload (same shape as /compare)" }
}
```

## 4) GET `/health`

Simple API health check.

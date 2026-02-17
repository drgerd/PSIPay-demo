# API Contracts (MVP)

Auth model:
- `GET /health` is public.
- `GET /products/{category}`, `POST /compare`, `POST/GET /recommendations` require
  `Authorization: Bearer <Cognito IdToken>`.

All responses include:
- `asOf` timestamps per source/series when possible
- `stale` boolean when returning cached data due to upstream failure

## 1) GET `/products/{category}`

Query params:
- `from` (optional, `YYYY-MM-DD`)
- `to` (optional, `YYYY-MM-DD`)
- `horizonMonths` (optional, integer, default `12`)

Header:
- `Authorization: Bearer <id-token>`

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

Header:
- `Authorization: Bearer <id-token>`

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

Credit-cards request example:

```json
{
  "category": "credit-cards",
  "criteria": {
    "monthlySpend": 1400,
    "payInFullMonthly": false,
    "carryDebt": true,
    "carryDebtAmount": 2500,
    "topCategories": ["groceries", "travel", "general"],
    "primaryGoal": "minimize interest"
  }
}
```

Credit-cards response notes:
- `options` includes 3-5 card types ranked by deterministic score
- `chartSeries` is empty for credit-cards (no irrelevant trend chart)
- `assumptions` always includes scoring assumptions

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
      "seriesCode": "IUMBV34",
      "label": "2y fixed",
      "unit": "percent",
      "asOf": "2026-02-15T10:00:00Z",
      "data": [{ "month": "2025-03", "value_pct": 4.85 }]
    }
  ]
}
```

## 3) `/recommendations`

Supports both:
- `POST /recommendations` with body (same as `/compare`)
- `GET /recommendations?category=<category>&criteria=<url-encoded-json>`

Header:
- `Authorization: Bearer <id-token>`

Response: deterministic compare output + AI payload (no debug data returned).

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

Example:

```json
{ "ok": true, "service": "psipay-api" }
```

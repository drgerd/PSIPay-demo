# Psipay

Serverless UK financial products comparison platform.

Supports 3 scenarios:
- Mortgages: fixed vs variable context and cost estimates.
- Savings: compare savings rates to inflation.
- Credit cards: recommend a card type based on spending and payment behavior.

Monorepo:
- `backend/` shared TypeScript business/data logic used by Lambda handlers
- `client/` Vite SPA (local dev + deploy to S3)
- `docs/` planning/architecture notes
- `infra/aws-sam/` AWS SAM app (Lambda + API Gateway + DynamoDB + S3 website)
- `scripts/` local dev + deploy helpers

## Prerequisites

- Node.js 20+
- AWS CLI configured (`aws configure`)
- AWS SAM CLI
- Docker (for local SAM)

Default deployment settings:
- Region: `eu-central-1`
- Stack name: `psipay`
- Resource tag: `psipay=true`

## Architecture

```text
                      +---------------------------+
                      |     Browser (SPA UI)     |
                      |  S3 Static Website Host  |
                      +-------------+-------------+
                                    |
                                    | HTTPS (REST)
                                    v
                      +-------------+-------------+
                      |     API Gateway (REST)   |
                      +-------------+-------------+
                                    |
                                    v
                      +-------------+-------------+
                      |   Lambda (Node.js/TS)     |
                      |  /health (public)         |
                      |  /products /compare       |
                      |  /recommendations (auth)  |
                      +------+------+-------------+
                             |     |
            read-through cache|     | outbound calls (max 2 retries)
                             |     v
                             |  +------------------------------+
                             |  | External APIs                |
                             |  | - Bank of England (BoE CSV)  |
                             |  | - ONS CPIH (JSON)            |
                             |  | - Gemini API (optional)      |
                             |  +------------------------------+
                             v
                 +------------------------+
                 | DynamoDB (TTL Cache)  |
                 +------------------------+

                +--------------------------+
                | Cognito User Pool (JWT) |
                +--------------------------+

                CloudWatch Logs (Lambda log group)
```

## Local Development

Start full local stack (SAM local API + DynamoDB Local + Vite):

```bash
bash scripts/dev-sam.sh
```

Optional local env vars can be placed in `scripts/env.local` (gitignored).

## Unit Tests

Install dependencies:

```bash
npm install --no-bin-links
```

Run all tests:

```bash
npm test
```

Run tests by workspace:

```bash
npm -w backend run test
npm -w client run test
```

## Environment Variables

Local-only (use `scripts/env.local` or your shell; do not commit secrets):

- `GEMINI_API_KEY` (optional) enables AI explanations in `/recommendations`.
- `GEMINI_MODEL` (optional) defaults to `gemini-flash-latest`.
- `GEMINI_TIMEOUT_MS` (optional) defaults to `8000`.
- `GEMINI_MAX_ATTEMPTS` (optional) defaults to `1` (max `2`).

Provided by SAM/Lambda runtime (you do not need to set manually when deployed):

- `CACHE_TABLE_NAME` (DynamoDB table name)
- `DEFAULT_HISTORY_MONTHS` (defaults to `12`)
- `ONS_CPIH_VERSION` (defaults to `66`)
- `DYNAMODB_ENDPOINT` (set by SAM local only)

Local SAM + DynamoDB Local:

- `scripts/dev-sam.sh` injects a container-safe DynamoDB endpoint and dummy AWS credentials for DynamoDB Local.

## Create Infrastructure + Deploy App

This provisions and deploys all required AWS services through SAM:
- API Gateway
- Lambda
- DynamoDB (cache)
- S3 static website bucket
- CloudWatch Logs (Lambda log group with retention)
- Cognito User Pool + App Client (JWT auth)

Run:

```bash
bash scripts/deploy.sh --stack psipay --region eu-central-1 --bucket <globally-unique-bucket>
```

What the script does:
- Builds and deploys SAM stack from `infra/aws-sam/template.yaml`
- Passes stack/resource tag `psipay=true`
- Builds frontend and uploads `client/dist` to S3
- Writes runtime `client/dist/config.json` with deployed API URL before upload
- Writes Cognito auth config (region/userPoolId/clientId) into `client/dist/config.json`

Optional:

```bash
bash scripts/deploy.sh --stack psipay --region eu-central-1 --bucket <globally-unique-bucket> --logs-retention-days 30
```

Bootstrap the fixed test user after first deploy:

```bash
bash scripts/bootstrap-cognito-user.sh --stack psipay --region eu-central-1
```

Default credentials:
- Username: `psipay_user`
- Password: `psipay!12345678`

## Delete Infrastructure

To remove all provisioned resources:

```bash
bash scripts/destroy.sh --stack psipay --region eu-central-1
```

The script empties the website S3 bucket first, then runs `sam delete`.

## Post-Deploy Smoke Checks

```bash
curl -s <api-base-url>/health
curl -s <api-base-url>/products/mortgages
curl -s -X POST <api-base-url>/compare \
  -H 'content-type: application/json' \
  -d '{"category":"mortgages","criteria":{"loanAmount":200000,"horizonMonths":24}}'
```

## API

Base URL (deployed): `https://<restApiId>.execute-api.eu-central-1.amazonaws.com/Prod`

### GET `/health` (public)

```bash
curl -s <api-base-url>/health
```

Example response:

```json
{ "ok": true, "service": "psipay-api" }
```

### GET `/products/{category}`

```bash
curl -s "<api-base-url>/products/mortgages?horizonMonths=12" \
  -H "Authorization: Bearer <id-token>"
```

Example response (shape):

```json
{
  "category": "mortgages",
  "stale": false,
  "series": [
    {
      "seriesCode": "IUMBV34",
      "label": "2y fixed",
      "unit": "percent",
      "asOf": "2026-02-16T23:31:10.595Z",
      "data": [{ "month": "2026-01", "value_pct": 3.91 }]
    }
  ]
}
```

### POST `/compare`

```bash
curl -s -X POST <api-base-url>/compare \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <id-token>' \
  -d '{"category":"savings","criteria":{"deposit":10000,"horizonMonths":12}}'
```

Example response (shape):

```json
{
  "category": "savings",
  "stale": false,
  "asOf": { "CFMHSCV": "2026-02-16T23:31:10.595Z", "CPIH_YOY": "2026-02-16T23:31:10.595Z" },
  "assumptions": ["Real rate is approximated as nominal minus CPIH YoY"],
  "options": [
    {
      "id": "market-average-sight-deposit",
      "label": "Market-average sight deposit",
      "rate_pct": 3.5,
      "metrics": {
        "inflation_yoy_pct": 2.6,
        "real_rate_pct": 0.9,
        "projected_balance_est": 10355.12
      }
    }
  ],
  "chartSeries": [
    {
      "seriesCode": "CFMHSCV",
      "label": "sight deposits",
      "unit": "percent",
      "asOf": "2026-02-16T23:31:10.595Z",
      "data": [{ "month": "2026-01", "value_pct": 3.5 }]
    }
  ]
}
```

### POST `/recommendations`

```bash
curl -s -X POST <api-base-url>/recommendations \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <id-token>' \
  -d '{"category":"mortgages","criteria":{"loanAmount":200000,"horizonMonths":24,"riskTolerance":"prefer-certainty"}}'
```

Example response (shape):

```json
{
  "category": "mortgages",
  "recommendationShort": "Based on the latest market data, 2y fixed is currently the strongest fit.",
  "recommendation": {
    "primaryChoice": "2y fixed",
    "nextBestAlternative": "5y fixed",
    "confidence": "medium",
    "forecastMessage": "If the base rate stays elevated over the next 6-12 months, fixed options are likely to remain more predictable for monthly budgeting.",
    "keyFactors": ["Based on latest available BoE/ONS series"],
    "tradeoffs": ["Figures are estimates and not provider-specific offers"],
    "whatWouldChange": ["Different user preferences or time horizon"],
    "actionChecklist": ["Review the top two options side by side in the comparison table"]
  },
  "ai": { "used": false, "fallback": true, "reason": "ai_unavailable" },
  "compare": { "category": "mortgages", "options": [], "chartSeries": [], "assumptions": [], "asOf": {} }
}
```

Notes:
- If Gemini is configured and responsive, `ai.used=true` and `ai.model` is set.
- If Gemini is missing/slow/unavailable, the API returns a deterministic fallback.
- `/health` is intentionally public; all other API routes require a Cognito JWT.

## Notes

- `scripts/env.local` is for local-only values and is not committed.
- `GEMINI_API_KEY` can be provided in your shell or `scripts/env.local` before deploy.
- Runtime client config is generated during deploy; tracked source files are not mutated.

Docs:
- Data pipeline rules: `docs/Skills-DataSources.md`
- API shapes: `docs/API-Contracts.md`

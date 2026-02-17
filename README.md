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

## Leadership & Architecture

### Trade-offs

I optimized for a simple, deployable serverless shape: one API Gateway + one Lambda router (multiple routes) + DynamoDB TTL
cache + S3 static site, all provisioned via SAM. This keeps cognitive load low and makes the reviewer workflow predictable
(deploy once, exercise endpoints, delete stack).

To keep the system explainable and safe, the ranking/selection is deterministic and the Gemini layer only produces
narrative text over the deterministic outputs (and can fall back to deterministic text when Gemini is slow/unavailable).
The trade-off is that AI does not “discover” better answers than the deterministic engine, but it avoids hallucinated
numbers and keeps behavior stable for testing.

The UI is intentionally minimal and functional (forms + charts + recommendation) and not product-grade visually. I
prioritized correctness, deployability, and testability over polish (design system, accessibility pass, responsive
refinements, and richer UX flows). This is sufficient for the assignment demo/user journey but would need investment
for a real consumer-facing product.

For demo safety, I added a minimal Cognito JWT gate plus API Gateway throttling. The trade-off is added setup steps
(bootstrapping a demo user) and a basic login UX, but it prevents drive-by traffic from running up costs during an
internet-exposed test.

### Team Planning (3 devs, 2 weeks)

Assumption: requirements and acceptance criteria were captured in “week 0” (before engineering start), so week 1 is
execution rather than discovery. Delivery is organized as vertical slices (end-to-end thin features) to create a fast
feedback loop with a working demo early, rather than building horizontal layers in isolation.

Week 1 (vertical slices, incremental):
- Slice 1: SAM deploy/destroy, `/health`, frontend boot, env/config plumbing.
- Slice 2: Mortgages end-to-end (BoE fetch + cache + deterministic compare + chart + recommendation copy).
- Slice 3: Savings end-to-end (BoE + ONS + cache + compare + chart + stale/error handling).
- Slice 4: Credit cards end-to-end (deterministic scoring + UI form + recommendation; no irrelevant chart).
- Slice 5: Auth + safety (Cognito authorizer, UI login, API throttling; keep `/health` public).

Week 2 (hardening + quality):
- Unit tests for deterministic logic, parsing/validation, and retry behavior; tighten TypeScript contracts.
- Observability: structured logs, correlation IDs, and dashboards/alarms for throttles/errors/timeouts.
- Performance polish (bundle splitting, caching effectiveness) and documentation completeness.

Suggested ownership (with pairing to avoid silos):
- Dev A (Backend/data): data clients, retries, caching, deterministic engines; pairs with Dev C on infra wiring.
- Dev B (Frontend/UX): dashboard/forms/charts/login UX; pairs with Dev A to validate API contracts and error UX.
- Dev C (Infra/DevEx): SAM template, throttling/auth, deploy automation, CloudWatch/alarms, README runbook.

### Production Readiness

Before production I would:
- Secrets: move `GEMINI_API_KEY` to AWS Secrets Manager/SSM (not CloudFormation parameters), rotate keys, and apply
  least-privilege IAM.
- Edge/security: put CloudFront in front of S3 + API, enforce HTTPS, add security headers, consider WAF/bot controls,
  and configure stricter CORS.
- Observability: structured application logs (not only Lambda START/END), request IDs, CloudWatch dashboards/alarms,
  and tracing (X-Ray/OpenTelemetry).
- Reliability: explicit timeouts per upstream, better error classification, and clearer “stale served” metrics; consider
  backoff jitter and circuit breakers.
- Auth: real user lifecycle (no fixed demo user), MFA/password reset, token refresh handling, and safer token storage.
- CI/CD: automated pipeline, `sam validate --lint`, unit tests, security scanning, and environment promotion.
- Data quality: schema checks for upstream payloads, stricter input validation, and clearer user-facing assumptions.

### Infrastructure Cost Estimate (Production Scale)

This estimate is illustrative and should be recalculated using your region’s current AWS pricing. It assumes:
- API Gateway REST API
- Lambda 512 MB average 300 ms
- DynamoDB on-demand (read-through cache)
- Modest CloudWatch logging
- S3 static website (no CloudFront)

Example usage assumptions:
- 1,000,000 API requests / month
- DynamoDB: ~1,000,000 reads + 200,000 writes / month
- CloudWatch Logs: ~1 GB ingested / month
- Cognito: 10,000 MAU

Rough monthly costs (order-of-magnitude; pricing varies by region/account):
- API Gateway (REST): ~ \$3.50 per 1M requests => ~\$3.50
- Lambda requests: ~ \$0.20 per 1M requests => ~\$0.20
- Lambda compute: 1M * 0.3s * 0.5 GB = 150,000 GB-s
  - using ~$0.0000167/GB-s as a rough reference => ~\$2.50
- DynamoDB on-demand: reads (~\$0.25/1M) + writes (~\$1.25/1M)
  - 1.0M reads => ~\$0.25
  - 0.2M writes => ~\$0.25
- CloudWatch Logs ingestion: ~\$0.50/GB => ~\$0.50
- S3 storage/requests at this scale: typically cents to low dollars

Subtotal (excluding Cognito): roughly 7\$ – 10\$ / month under these assumptions.

Cognito cost depends on MAU pricing in `eu-central-1` and your account’s free tier usage; for an accurate number, plug
MAU into the AWS pricing calculator for Cognito User Pools.

### If I Had More Time

Next improvements would be:
- More data sources (e.g., FCA register) and richer “product” modeling beyond rate series (fees, eligibility,
  constraints).
- A more realistic credit-card model (intro APR periods, balance transfer fees, representative APR ranges) and scenario
  saving/sharing.
- Better UX: guided questions per scenario, improved mobile layout, code-split charts to reduce bundle size, and
  accessibility improvements.
- Cost controls: AWS Budgets with alerts, more granular throttling per route, and caching metrics to quantify upstream
  savings.

## Notes

- `scripts/env.local` is for local-only values and is not committed.
- `GEMINI_API_KEY` can be provided in your shell or `scripts/env.local` before deploy.
- Runtime client config is generated during deploy; tracked source files are not mutated.

Docs:
- Data pipeline rules: `docs/Skills-DataSources.md`
- API shapes: `docs/API-Contracts.md`

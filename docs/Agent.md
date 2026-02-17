# Agent.md - Implementation Plan (Psipay)

## Dependencies Verified
- Node.js v20.x ✅
- npm 10.x ✅
- AWS CLI v2 ✅
- SAM CLI 1.154.0 ✅ (installed via pipx to `~/.local/bin/sam`)
- Docker 28.x ✅
- DynamoDB Local (running on port 8000) ✅
- Playwright browsers ✅

## Locked Decisions
- Market-average (type-level) comparisons (no provider offers)
- Live sources: BoE + ONS CPIH (index -> YoY %, monthly)
- Backend: Node.js Lambda + API Gateway (REST)
- Cache: DynamoDB (TTL) with DynamoDB Local for dev; same cache codepath everywhere
- Frontend: Vite SPA runs local + deploys static to S3; runtime `/config.json`
- AI: Gemini structured JSON + `recommendationShort` (1-2 sentences)
- CORS: MVP allow-all
- History window: default last 12 months
- Time aggregation: normalize to `YYYY-MM`, take month-end (last available point in month)

## Series Codes / Data Sources

### BoE (rates)
- Mortgages fixed: `IUMBV34` (2y), `IUMBV37` (3y), `IUMBV42` (5y)
- Variable proxy: `IUMTLMV` (revert-to-rate)
- Base rate: `IUMBEDR`
- Savings: `CFMHSCV`

### ONS CPIH (index -> YoY %)
Endpoint template:
- `https://api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/${ONS_CPIH_VERSION}/observations?time=*&geography=K02000001&aggregate=CP00`

Normalization:
- Parse `Time.id` in `MMM-YY` -> `YYYY-MM`
- Parse `observation` string -> float index
- Sort ascending; filter invalid; handle missing months

YoY%:
- `(Index(t) / Index(t-12) - 1) * 100`, round to 2dp
- Skip months without a prior-year observation

## Environment Variables

Backend:
- `GEMINI_API_KEY` (required for `/recommendations`)
- `ONS_CPIH_VERSION` (default `66`)
- `DEFAULT_HISTORY_MONTHS` (default `12`)
- `CACHE_TABLE_NAME` (default `Cache`)
- `AWS_REGION` (default `eu-central-1`)

Local DynamoDB:
- `DYNAMODB_ENDPOINT` (e.g. `http://localhost:8000`)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (dummy values for local only)

Frontend:
- runtime `/config.json`: `{ "apiBaseUrl": "http://127.0.0.1:3000" }` (example)

## API (minimum 3 endpoints)

1) `GET /products/{category}?from&to`
- Returns normalized series history (default last 12m), labels, `asOf`, `stale`

2) `POST /compare`
Body: `{ "category": "...", "criteria": { ... } }`
- Returns deterministic comparison table + chart series + assumptions + asOf

3) `POST /recommendations`
Body same as `/compare`
- Runs deterministic compare first, then Gemini using computed metrics only
- Returns strict JSON + `recommendationShort`
- If AI JSON invalid: one repair retry; else deterministic fallback narrative

## Deterministic Comparison (no AI)

Mortgages:
- Payment estimate + interest cost over horizon
- Compare fixed vs revert-to-rate; include base-rate sensitivity scenarios

Savings:
- Nominal (`CFMHSCV`) vs CPIH YoY and `real_rate_pct = nominal - inflation_yoy_pct` (explicit approximation)
- Single-series savings rate with explanation and assumptions

Credit cards:
- Type-only rule-based fit (revolve behavior dominates), simple estimates with assumptions

## DynamoDB Local (dev)
- Use Docker DynamoDB Local
- Backend auto-creates `Cache` table on startup when `DYNAMODB_ENDPOINT` is set:
  - PK: `cacheKey` (string)
  - TTL attribute: `ttlEpoch` (number)
- Read-through cache; on upstream failure return cached payload + `stale=true`

## Required Skills / Implementation Notes
- Node.js (TypeScript recommended), AWS SDK v3 (DynamoDB)
- CSV parsing (BoE) + robust date normalization
- JSON schema validation for Gemini output (e.g., Ajv)
- SAM template wiring (Lambda, API Gateway, DynamoDB, env vars)
- Vite/React + charting + runtime config pattern
- Structured logs + surfacing `asOf/stale` to UI

## Local Run (target workflow)
1) Start DynamoDB Local (Docker): `docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local`
2) Build SAM: `sam build`
3) Start backend (`sam local start-api`) pointing to DynamoDB Local:
   ```
   DYNAMODB_ENDPOINT=http://localhost:8000 \
   AWS_ACCESS_KEY_ID=dummy \
   AWS_SECRET_ACCESS_KEY=dummy \
   AWS_REGION=eu-central-1 \
   sam local start-api
   ```
4) Start frontend (Vite): `cd client && npm run dev`
5) Verify endpoints with sample payloads for mortgages and savings

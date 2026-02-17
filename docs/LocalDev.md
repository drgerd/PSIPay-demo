# Local Development (Backend + Frontend + DynamoDB Local)

Goal: run the full stack locally using:
- DynamoDB Local (cache)
- SAM Local (Lambda + API Gateway emulation)
- Vite for frontend

## 1) Backend environment variables (local)

Set (examples):

```
ONS_CPIH_VERSION=66
DEFAULT_HISTORY_MONTHS=12
GEMINI_API_KEY=... (required for AI recommendations)
CACHE_TABLE_NAME=Cache
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
```

Note: SAM local Lambda runs in Docker. The script creates a shared Docker network
(`psipay-local`) and starts:
- DynamoDB Local as `dynamodb-local`
- SAM local API on the same Docker network

So Lambda reaches DynamoDB Local via `http://dynamodb-local:8000`.
Do not set `DYNAMODB_ENDPOINT` in `scripts/env.local` for SAM local;
`scripts/dev-sam.sh` injects the correct endpoint for container networking.

## 2) Run backend (SAM Local)

Target command:

```sh
bash scripts/dev-sam.sh
```

The script now creates the local DynamoDB cache table automatically if missing.

Manual check:

```bash
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy AWS_REGION=eu-central-1 \
aws dynamodb describe-table --table-name Cache --endpoint-url http://127.0.0.1:8000
```

If table is missing, create it manually:

```bash
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy AWS_REGION=eu-central-1 \
aws dynamodb create-table \
  --table-name Cache \
  --attribute-definitions AttributeName=cacheKey,AttributeType=S \
  --key-schema AttributeName=cacheKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://127.0.0.1:8000
```

## 3) Frontend runtime config

The frontend reads `/config.json` at runtime:

```
{ "apiBaseUrl": "http://127.0.0.1:3000" }
```

For local dev, Vite serves a local `public/config.json`.

## 4) Quick smoke tests

Once running:
- `GET /products/mortgages`
- `POST /compare` (mortgages)
- `GET /recommendations?category=mortgages&criteria=%7B%22loanAmount%22%3A200000%2C%22horizonMonths%22%3A24%7D`

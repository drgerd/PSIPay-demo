# Local Development (Backend + Frontend + DynamoDB Local)

Goal: run the full stack locally using:
- `sam local start-api` for Lambda/API
- Vite for frontend
- DynamoDB Local (Docker) for cache

## 1) Start DynamoDB Local (Docker)

Run (example):

```
docker run --rm -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
```

## 2) Backend environment variables (local)

Set (examples):

```
DYNAMODB_ENDPOINT=http://localhost:8000
CACHE_TABLE_NAME=Cache
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
ONS_CPIH_VERSION=66
DEFAULT_HISTORY_MONTHS=12
GEMINI_API_KEY=... (only needed when calling /recommendations)
```

Note:
- the backend must auto-create the `Cache` table when `DYNAMODB_ENDPOINT` is set and the table is missing
- TTL attribute name: `ttlEpoch`

## 3) Run backend (SAM local)

Target command (final repo will include the exact one):

```
sam build
sam local start-api
```

Windows note:
- if SAM runs Lambda in a container and cannot reach `localhost:8000`, use `http://host.docker.internal:8000` for `DYNAMODB_ENDPOINT`.

## 4) Frontend runtime config

The frontend reads `/config.json` at runtime:

```
{ "apiBaseUrl": "http://127.0.0.1:3000" }
```

For local dev, Vite serves a local `public/config.json`.

## 5) Quick smoke tests

Once running:
- `GET /products/mortgages`
- `POST /compare` (mortgages)
- `POST /recommendations` (requires `GEMINI_API_KEY`)

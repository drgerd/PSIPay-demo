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
PORT=3000
HOST=127.0.0.1
GEMINI_API_KEY=... (only needed for later AI integration)
```

## 2) Run backend (SAM Local)

Target command:

```sh
bash scripts/dev-sam.sh
```

## 3) Frontend runtime config

The frontend reads `/config.json` at runtime:

```
{ "apiBaseUrl": "http://127.0.0.1:3000", "useMocks": false }
```

For local dev, Vite serves a local `public/config.json`.

## 4) Quick smoke tests

Once running:
- `GET /products/mortgages`
- `POST /compare` (mortgages)
- `POST /recommendations`

Cache bypass (optional): add `?skipCache=1` to any endpoint.

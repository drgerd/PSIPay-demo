# Psipay

Serverless UK financial products comparison platform.

Monorepo:
- `backend/` AWS SAM (Lambda + API Gateway + DynamoDB cache)
- `client/` Vite SPA (local dev + deploy to S3)
- `docs/` planning/architecture notes
- `scripts/` local dev + deploy helpers

## Quick Start (Local)

Prereqs:
- Node.js 20+
- Docker Desktop (for DynamoDB Local)
- AWS SAM CLI

1) Start DynamoDB Local + backend + client:

PowerShell:

```
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Or bash:

```
bash scripts/dev.sh
```

2) Set `GEMINI_API_KEY` if you want `/recommendations`.

Client-only (mock mode):

```
cd client
npm install
npx msw init public --save
npm run dev
```

Make sure `client/public/config.json` contains `"useMocks": true`.

## Deploy (High Level)

Backend:
- `scripts/deploy-backend.ps1` (or `.sh`)

Frontend:
- `scripts/deploy-frontend.ps1` (or `.sh`) to build and `aws s3 sync`

Docs:
- Data pipeline rules: `docs/Skills-DataSources.md`
- API shapes: `docs/API-Contracts.md`
- OpenCode Chrome MCP debug: `docs/OpenCode-Chrome-Debug.md`

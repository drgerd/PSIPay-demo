# Psipay

Serverless UK financial products comparison platform.

Monorepo:
- `backend/` shared TypeScript business/data logic used by Lambda handlers
- `client/` Vite SPA (local dev + deploy to S3)
- `docs/` planning/architecture notes
- `infra/aws-sam/` AWS SAM app (Lambda + API Gateway + DynamoDB + S3 website)
- `scripts/` local dev + deploy helpers

## Quick Start (Local)

Prereqs:
- Node.js 20+

1) Start local SAM API (Lambda emulation) + client:

PowerShell:

```
powershell -ExecutionPolicy Bypass -File scripts/dev-sam.ps1
```

Or bash:

```
bash scripts/dev-sam.sh
```

2) Set `ONS_CPIH_VERSION` if you need a different ONS dataset version.

Make sure `client/public/config.json` contains `"useMocks": false`.

## Deploy (High Level)

All resources deploy via SAM (Lambda + API Gateway + DynamoDB cache + S3 website).

- Bash: `bash scripts/deploy.sh --stack psipay --bucket <unique-bucket-name>`
- PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -StackName psipay -BucketName <unique-bucket-name>`

Notes:
- Region default: `eu-central-1` (override with `AWS_REGION` or `--region`)
- Runtime client config is written to `client/dist/config.json` during deploy (no tracked files are mutated)

Docs:
- Data pipeline rules: `docs/Skills-DataSources.md`
- API shapes: `docs/API-Contracts.md`
- OpenCode Chrome MCP debug: `docs/OpenCode-Chrome-Debug.md`
- OpenCode Playwright validation: `docs/OpenCode-Playwright-Validation.md`

## E2E Validation (Playwright)

- Mock UI smoke: `npm run test:e2e:mock`
- Local Node API integration: `npm run test:e2e:local-api`

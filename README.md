# Psipay

Serverless UK financial products comparison platform.

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

## Local Development

Start full local stack (SAM local API + DynamoDB Local + Vite):

```bash
bash scripts/dev-sam.sh
```

Optional local env vars can be placed in `scripts/env.local` (gitignored).

## Create Infrastructure + Deploy App

This provisions and deploys all required AWS services through SAM:
- API Gateway
- Lambda
- DynamoDB (cache)
- S3 static website bucket
- CloudWatch Logs (Lambda log group with retention)

Run:

```bash
bash scripts/deploy.sh --stack psipay --region eu-central-1 --bucket <globally-unique-bucket>
```

What the script does:
- Builds and deploys SAM stack from `infra/aws-sam/template.yaml`
- Passes stack/resource tag `psipay=true`
- Builds frontend and uploads `client/dist` to S3
- Writes runtime `client/dist/config.json` with deployed API URL before upload

Optional:

```bash
bash scripts/deploy.sh --stack psipay --region eu-central-1 --bucket <globally-unique-bucket> --logs-retention-days 30
```

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

## Notes

- `scripts/env.local` is for local-only values and is not committed.
- `GEMINI_API_KEY` can be provided in your shell or `scripts/env.local` before deploy.
- Runtime client config is generated during deploy; tracked source files are not mutated.

Docs:
- Data pipeline rules: `docs/Skills-DataSources.md`
- API shapes: `docs/API-Contracts.md`
- OpenCode Chrome MCP debug: `docs/OpenCode-Chrome-Debug.md`

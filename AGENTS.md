# AGENTS.md

Agent operating guide for this repo.

## Project Snapshot

- Backend runtime: AWS Lambda (Node.js/TypeScript) via AWS SAM.
- Frontend: React + Vite SPA served from S3 static website.
- Data sources: Bank of England CSV API + ONS CPIH observations.
- Cache: DynamoDB TTL read-through cache with `stale` fallback.
- AI: Gemini explains deterministic results (must not invent numbers).

No Cursor/Copilot instruction files found (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`).

## Commands

From repo root:

```bash
# Install (WSL/NTFS safe)
npm install --no-bin-links

# Build everything
npm run build

# Lint (placeholders today)
npm run lint
```

Backend build only:

```bash
npm -w backend run build
```

Client build/dev:

```bash
npm -w client run build
npm -w client run dev
npm -w client run preview
```

Local full-stack dev (SAM local + DynamoDB Local + Vite):

```bash
bash scripts/dev-sam.sh
```

Deploy (SAM + S3 upload):

```bash
bash scripts/deploy.sh --stack psipay --bucket <globally-unique-bucket>
```

### “Single Test” / Minimal Verification

There is no automated test runner configured right now. Use smoke calls:

```bash
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:3000/products/mortgages

curl -s -X POST http://127.0.0.1:3000/compare \
  -H 'content-type: application/json' \
  -d '{"category":"mortgages","criteria":{"loanAmount":200000,"horizonMonths":24}}'
```

To verify one scenario quickly inside Node:

```bash
node -e "fetch('http://127.0.0.1:3000/health').then(r=>r.json()).then(console.log)"
```

## Repo Map

- `infra/aws-sam/template.yaml`: API Gateway, Lambda, DynamoDB, S3 website.
- `infra/aws-sam/src/app.ts`: Lambda router (`/products`, `/compare`, `/recommendations`, `/health`).
- `backend/src/data/*`: external API clients (BoE/ONS).
- `backend/src/services/*`: business logic, caching, comparisons, Gemini.
- `client/src/pages/Dashboard.tsx`: UI flow for all 3 scenarios.
- `client/src/components/DeveloperDiagnostics.tsx`: debug panel (collapsed).

## API Conventions

- History window:
  - products: `GET /products/{category}?horizonMonths=12`
  - compare/recommend: uses `criteria.horizonMonths`.
- Error responses from Lambda use `{ errorCode, message, details? }`.

## Coding Standards

### TypeScript

- Strict mode stays on; avoid `any`.
- Prefer explicit return types for exported functions.
- Use `import type` for type-only imports.

### Imports

Order:
1) external
2) internal relative
3) `import type`

### Naming

- Files: kebab-case.
- Types: PascalCase.
- Functions/vars: camelCase.
- Config constants: SCREAMING_SNAKE_CASE.

### Formatting

- 2 spaces; double quotes; semicolons.
- Keep lines ~100 chars where practical.

### Error Handling

- Validate inputs; return 400 for bad input.
- Use try/catch around network calls.
- For upstream failures: use cached fallback when available and set `stale: true`.

### AI (Gemini)

- Deterministic engine decides ranking.
- Gemini may only *explain* the deterministic output.
- Never invent numbers; prompt includes deterministic outputs.
- Temporary debug visibility: `recommendation.ai.debug` contains prompt/response/errors and is shown in Developer Diagnostics.

### Frontend UX

- Show user-facing recommendation first.
- Keep `DeveloperDiagnostics` collapsed by default.
- For `credit-cards`, do not show irrelevant trend charts.

### Secrets

- Never commit keys.
- Use `scripts/env.local` (gitignored) for local env.
- Deployed secrets: SAM parameters/env vars.

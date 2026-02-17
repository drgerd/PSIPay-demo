# OpenCode + Playwright Validation Guide

Use this guide when asking OpenCode to validate Psipay UI flows with Playwright.

## What is available

- Playwright is already installed in root workspace.
- Test files:
  - `e2e/dashboard.spec.js` (browser-mock mode using `?mocks=1`)
- `e2e/dashboard.local-api.spec.js` (local Node API mode)
- Configs:
  - `playwright.config.js` (mock/browser interception validation)
- `playwright.local-api.config.js` (local Node API + live data)

## Recommended validation modes

### 1) Quick UI smoke (mock mode)

Runs fastest and validates core UI rendering/interaction.

```bash
npm run test:e2e:mock
```

### 2) Integration-like local API validation (recommended)

Validates client against local Node routes (`/products`, `/compare`, `/recommendations`) with live BoE/ONS data.

```bash
npm run test:e2e:local-api
```

Notes:
- Requires Node.js available in PATH.
- This mode starts the Node API server and client preview automatically via Playwright `webServer`.

## Using OpenCode effectively

When asking OpenCode, use a direct request like:

```text
Run Playwright local-api validation, fix any failures, and summarize what changed.
```

For mock mode:

```text
Run Playwright mock validation and report the failing assertions with root cause.
```

## Troubleshooting

- `npm run dev` fails
  - Ensure Node.js 20+ is installed.
- Browser not installed
  - Run: `npm run e2e:install`
- Port conflict (`3000` or `4173`)
  - Stop existing local servers or change ports in playwright config.

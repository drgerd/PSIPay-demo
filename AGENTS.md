# AGENTS.md - Development Guide for Psipay

This file provides guidance for agentic coding agents working in this repository.

## Project Overview

Psipay is a UK financial products comparison platform with:
- **Backend**: Node.js/TypeScript shared services running on AWS Lambda via SAM
- **Frontend**: React/Vite SPA
- **E2E Tests**: Playwright
- **Data Sources**: Bank of England API, ONS CPIH data

## 1. Build, Lint, and Test Commands

### Root Commands (from workspace root)

```bash
# Install all dependencies
npm install

# Build both backend and client
npm run build

# Run linters (backend + client)
npm run lint

# Install Playwright browsers
npm run e2e:install
```

### Running Tests

```bash
# E2E tests with mock data (default)
npm run test:e2e

# E2E tests with local API
npm run test:e2e:local-api

# Run a single E2E test file
npx playwright test e2e/dashboard.spec.js

# Run a single test by name
npx playwright test -g "test name pattern"

# Run tests in headed mode
npx playwright test --headed

# Run with UI (interactive)
npx playwright test --ui
```

### Backend Commands

```bash
# Development (SAM local)
bash scripts/dev-sam.sh

# Build TypeScript
cd backend
npm run build

# Production runtime
# Deploy via SAM (Lambda + API Gateway)

# Lint (TODO - not implemented)
npm run lint
```

### Frontend Commands

```bash
cd client

# Development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint (TODO - not implemented)
npm run lint
```

### Running Locally with SAM (Lambda emulation)

```bash
# DynamoDB Local must be running first
docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local

# Build and run SAM
cd infra/aws-sam
sam build
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=dummy \
AWS_SECRET_ACCESS_KEY=dummy \
AWS_REGION=eu-west-2 \
sam local start-api
```

## 2. Code Style Guidelines

### TypeScript Configuration

- **Backend**: `backend/tsconfig.json` - CommonJS, strict mode, Node types
- **Client**: `client/tsconfig.json` - ESNext, React JSX, strict mode

Always enable strict mode. Do not use `any` unless absolutely necessary.

### Imports

**Order (recommended):**
1. External libraries (React, AWS SDK, etc.)
2. Internal modules (relative imports)
3. Type imports (use `import type`)

```typescript
// Good
import { useState, useEffect } from "react";
import type { FC } from "react";
import { fetchData } from "../services/api";
import type { User } from "../types";

// Backend example
import { getProducts } from "./controllers/productsController";
import type { Category } from "./types/contracts";
```

### Naming Conventions

- **Files**: kebab-case for everything (`productsController.ts`, `trend-chart.tsx`)
- **TypeScript types**: PascalCase (`Category`, `ProductsResponse`, `SeriesItem`)
- **Variables/functions**: camelCase (`getProducts`, `fetchData`, `loanAmount`)
- **Constants**: SCREAMING_SNAKE_CASE for config values (`DEFAULT_HISTORY_MONTHS`)
- **React components**: PascalCase (`Dashboard.tsx`, `CriteriaForm.tsx`)

### Type Definitions

- Use explicit types for function parameters and return types
- Export types alongside implementations when they're part of the public API
- Use generics when appropriate to avoid type duplication

```typescript
// Good
export async function getProducts(
  category: Category,
  query?: { from?: string; to?: string }
): Promise<ProductsResponse> {
  // ...
}

// Good - discriminated union for state
type LoadingState = { status: "loading" };
type SuccessState<T> = { status: "success"; data: T };
type ErrorState = { status: "error"; error: Error };
type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;
```

### Error Handling

- Use proper error types, not raw strings
- Always handle async errors with try/catch
- Return appropriate HTTP status codes (400 for bad input, 500 for server errors)
- Log errors appropriately (console.error for now, structured logging planned)

```typescript
// Good - Lambda handler error handling
async function handler() {
  try {
    const data = await getData();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "internal_error" }) };
  }
}
```

### React Conventions

- Use functional components with hooks
- Keep components small and focused
- Co-locate types with components when only used there
- Use `import type` for type-only imports to help bundler

```typescript
// Good
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export function MyComponent({ title, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);

  // ...
}
```

### Formatting

- Use 2 spaces for indentation
- Use double quotes for strings in TypeScript/JSX
- Use semicolons
- Maximum line length: 100 characters (soft limit)
- Add trailing commas in multiline objects/arrays

### API Response Patterns

All API responses should include:
- `asOf` timestamps when possible
- `stale` boolean when returning cached data

```typescript
// Response shape
{
  category: "mortgages",
  stale?: boolean,
  series: SeriesItem[],
  // ...
}
```

### Git Conventions

- Use meaningful commit messages
- Branch naming: `feature/description`, `fix/description`, `docs/description`
- Run tests before committing

### What NOT Do

- Do not commit secrets To, API keys, or credentials
- Do not use `// TODO` without a description
- Do not leave console.log statements in production code
- Do not disable TypeScript strict mode
- Do not use relative paths that go up more than 2 levels (`../../`)

## 3. Key File Locations

```
psipay/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── data/         # External API clients (BoE, ONS)
│   │   ├── fixtures/     # Mock data
│   │   ├── types/        # TypeScript definitions
│   │   └── services/     # Shared logic used by Lambda
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/          # HTTP client
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── mocks/        # MSW handlers
│   │   └── types/        # TypeScript definitions
│   ├── public/
│   │   └── config.json   # Runtime config
│   └── package.json
├── e2e/                  # Playwright tests
├── infra/aws-sam/        # SAM template
└── docs/                 # Documentation
```

## 4. Environment Variables

### Backend (local)
```
ONS_CPIH_VERSION=66
DEFAULT_HISTORY_MONTHS=12
PORT=3000
HOST=127.0.0.1
GEMINI_API_KEY=...  # For /recommendations endpoint
DYNAMODB_ENDPOINT=http://localhost:8000  # Local development
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=eu-central-1
```

### Frontend Runtime
```json
// client/public/config.json
{
  "apiBaseUrl": "http://127.0.0.1:3000",
  "useMocks": false
}
```

## 5. Testing Philosophy

- E2E tests use Playwright with two configs:
  - `playwright.config.js` - Mock API responses (default)
  - `playwright.local-api.config.js` - Real local API
- Tests verify user journeys, not implementation details
- Each page/component should have corresponding E2E test coverage for key flows

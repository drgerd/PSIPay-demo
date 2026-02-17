# E2E Validation (Playwright)

This repo includes Playwright E2E tests that run against the Vite `preview` server.

## Setup

```sh
npm install
npm run e2e:install
```

## Run

```sh
npm run test:e2e
```

## Notes

- Tests use `/?mocks=1` to enable MSW browser mocks without changing `client/public/config.json`.
- Mock mode config: `playwright.config.js`
- Local Node API config: `playwright.local-api.config.js`
- Tests live in: `e2e/`

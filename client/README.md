# Client (Vite)

Runtime config:
- `public/config.json` with `apiBaseUrl`
- `public/config.json` with `useMocks` (`true` to run with MSW)

Local:
- `npm install`
- `npx msw init public --save`
- `npm run dev`

## Local run (mock-first)

1) Ensure `public/config.json` has:

```json
{
  "apiBaseUrl": "http://127.0.0.1:3000",
  "useMocks": true
}
```

2) Start app:

```
npm install
npx msw init public --save
npm run dev
```

Notes:
- With `useMocks: true`, the client serves `/products`, `/compare`, `/recommendations` from mock fixtures.
- To switch to real backend later, set `useMocks: false` and update `apiBaseUrl`.

Deploy to S3:
- `scripts/provision-frontend.*` to create a website bucket (MVP public)
- `scripts/deploy-frontend.*` to build and upload

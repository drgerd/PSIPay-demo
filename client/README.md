# Client (Vite)

Runtime config:
- `public/config.json` with `apiBaseUrl`
- `public/config.json` with `useMocks` (`false` to call local/backend API)

Local:
- `npm install`
- `npm run dev`

## Local run (with local Lambda API)

1) Ensure `public/config.json` has:

```json
{
  "apiBaseUrl": "http://127.0.0.1:3000",
  "useMocks": false
}
```

2) Start app:

```
npm install
npm run dev
```

Notes:
- In this mode, the client calls `/products`, `/compare`, `/recommendations` from the local Node API.
- Backend calls live BoE/ONS sources by default.
- Optional: set `useMocks: true` only if you want browser-level MSW interception.

Deploy to S3:
- `scripts/provision-frontend.*` to create a website bucket (MVP public)
- `scripts/deploy-frontend.*` to build and upload

# Client (Vite)

Runtime config:
- `public/config.json` with `apiBaseUrl`

Local:
- `npm install`
- `npm run dev`

## Local run (with local Lambda API)

1) Ensure `public/config.json` has:

```json
{
  "apiBaseUrl": "http://127.0.0.1:3000"
}
```

2) Start app:

```
npm install
npm run dev
```

Notes:
- In this mode, the client calls `/products`, `/compare`, `/recommendations` from the local Lambda API.
- Backend calls live BoE/ONS sources by default.

Deploy to S3:
- `bash scripts/deploy.sh --stack psipay --bucket <globally-unique-bucket>`

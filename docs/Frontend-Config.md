# Frontend Runtime Config (`config.json`)

Goal: deploy the same built static assets to multiple environments without rebuilding.

## Pattern

The SPA fetches `/config.json` at startup.

Example:

```json
{
  "apiBaseUrl": "https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/Prod"
}
```

Local dev example:

```json
{
  "apiBaseUrl": "http://127.0.0.1:3000"
}
```

## Hosting

- Local: `frontend/public/config.json` served by Vite.
- Cloud: upload `config.json` to the S3 bucket root alongside `index.html`.

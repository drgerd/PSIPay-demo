# Backend (AWS SAM)

Routes:
- `GET /products/{category}`
- `POST /compare`
- `POST /recommendations`

Local:
- DynamoDB Local recommended (see `docs/LocalDev.md`)

Deploy:
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-backend.ps1`

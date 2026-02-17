# Backend (AWS SAM)

Routes:
- `GET /products/{category}`
- `POST /compare`
- `POST /recommendations`

Local:
- DynamoDB Local recommended (see `docs/LocalDev.md`)

Deploy:
- `bash scripts/deploy.sh --stack psipay --bucket <globally-unique-bucket>`

#!/usr/bin/env bash
set -euo pipefail

API_PORT="${API_PORT:-3000}"
DDB_PORT="${DDB_PORT:-8000}"

echo "Starting DynamoDB Local on port ${DDB_PORT}..."
docker rm -f dynamodb-local >/dev/null 2>&1 || true
docker run -d --rm -p "${DDB_PORT}:8000" --name dynamodb-local amazon/dynamodb-local >/dev/null

export DYNAMODB_ENDPOINT="http://localhost:${DDB_PORT}"
export AWS_REGION="${AWS_REGION:-eu-west-2}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-local}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-local}"
export CACHE_TABLE_NAME="${CACHE_TABLE_NAME:-Cache}"
export ONS_CPIH_VERSION="${ONS_CPIH_VERSION:-66}"
export DEFAULT_HISTORY_MONTHS="${DEFAULT_HISTORY_MONTHS:-12}"

echo "Starting SAM local API on port ${API_PORT}..."
(cd backend && sam build && sam local start-api --port "${API_PORT}") &

echo "Starting client (Vite)..."
(cd client && npm install && npm run dev) &

echo "\nLocal services started:"
echo "- DynamoDB Local: http://localhost:${DDB_PORT}"
echo "- API (SAM local): http://127.0.0.1:${API_PORT}"

wait

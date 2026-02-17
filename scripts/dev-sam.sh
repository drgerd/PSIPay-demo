#!/usr/bin/env bash
set -euo pipefail

# Local dev with DynamoDB Local + SAM local API + Vite.

REGION="${AWS_REGION:-eu-central-1}"
API_PORT="${API_PORT:-3000}"
DDB_PORT="${DDB_PORT:-8000}"

SAM_BIN="$(command -v sam || true)"
if [[ -z "${SAM_BIN}" && -x "/home/${USER}/.local/bin/sam" ]]; then
  SAM_BIN="/home/${USER}/.local/bin/sam"
fi

if [[ -z "${SAM_BIN}" ]]; then
  echo "SAM CLI not found. Install with: pipx install aws-sam-cli" >&2
  exit 1
fi

# When npm is installed with --no-bin-links, SAM can't find esbuild.
export PATH="${PWD}/node_modules/esbuild/bin:${PATH}"

if [[ -f scripts/env.local ]]; then
  # shellcheck disable=SC1091
  source scripts/env.local
fi

echo "Starting DynamoDB Local on :${DDB_PORT}..."
if ! docker ps --format '{{.Names}}' | grep -q '^dynamodb-local$'; then
  docker run -d --rm --name dynamodb-local -p "${DDB_PORT}:8000" amazon/dynamodb-local >/dev/null
fi

echo "Building SAM..."
(cd infra/aws-sam && "${SAM_BIN}" build)

echo "Starting SAM local API on :${API_PORT}..."
export AWS_REGION="${REGION}"
export DYNAMODB_ENDPOINT="http://127.0.0.1:${DDB_PORT}"
export CACHE_TABLE_NAME="Cache"

# DynamoDB Local requires credentials to be present.
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-dummy}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-dummy}"

(cd infra/aws-sam && "${SAM_BIN}" local start-api --port "${API_PORT}") &

echo "Starting client (Vite)..."
(cd client && npm install --no-bin-links && npm run dev) &

echo "Local services started:"
echo "- API (SAM): http://127.0.0.1:${API_PORT}"
echo "- Client: see Vite output"

wait

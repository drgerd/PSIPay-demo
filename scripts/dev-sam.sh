#!/usr/bin/env bash
set -euo pipefail

# Local dev with DynamoDB Local + SAM local API + Vite.

REGION="${AWS_REGION:-eu-central-1}"
API_PORT="${API_PORT:-3000}"
DDB_PORT="${DDB_PORT:-8000}"
CACHE_TABLE_NAME="${CACHE_TABLE_NAME:-Cache}"
DOCKER_NETWORK="${DOCKER_NETWORK:-psipay-local}"

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
  source <(tr -d '\r' < scripts/env.local)
fi

echo "Starting DynamoDB Local on :${DDB_PORT}..."
if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  docker network create "${DOCKER_NETWORK}" >/dev/null
fi

if ! docker ps --format '{{.Names}}' | grep -q '^dynamodb-local$'; then
  docker run -d --rm --name dynamodb-local --network "${DOCKER_NETWORK}" -p "${DDB_PORT}:8000" amazon/dynamodb-local >/dev/null
fi

# DynamoDB Local requires credentials to be present for AWS CLI/SDK calls.
# Always use local dummy credentials to avoid malformed/real key issues.
export AWS_REGION="${REGION}"
export AWS_ACCESS_KEY_ID="dummy"
export AWS_SECRET_ACCESS_KEY="dummy"
export CACHE_TABLE_NAME="${CACHE_TABLE_NAME}"
DDB_LOCAL_ENDPOINT="http://127.0.0.1:${DDB_PORT}"

# Wait briefly for DynamoDB Local readiness.
if command -v aws >/dev/null 2>&1; then
  for _ in $(seq 1 20); do
    if aws dynamodb list-tables --endpoint-url "${DDB_LOCAL_ENDPOINT}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if command -v aws >/dev/null 2>&1; then
  if ! aws dynamodb describe-table --table-name "${CACHE_TABLE_NAME}" --endpoint-url "${DDB_LOCAL_ENDPOINT}" >/dev/null 2>&1; then
    echo "Creating DynamoDB Local table '${CACHE_TABLE_NAME}'..."
    aws dynamodb create-table \
      --table-name "${CACHE_TABLE_NAME}" \
      --attribute-definitions AttributeName=cacheKey,AttributeType=S \
      --key-schema AttributeName=cacheKey,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --endpoint-url "${DDB_LOCAL_ENDPOINT}" >/dev/null
    aws dynamodb update-time-to-live \
      --table-name "${CACHE_TABLE_NAME}" \
      --time-to-live-specification "Enabled=true,AttributeName=ttlEpoch" \
      --endpoint-url "${DDB_LOCAL_ENDPOINT}" >/dev/null 2>&1 || true
  fi
fi

echo "Building SAM..."
(cd infra/aws-sam && "${SAM_BIN}" build)

echo "Starting SAM local API on :${API_PORT}..."

SAM_PARAMETER_OVERRIDES="DynamoDbEndpoint=http://dynamodb-local:8000"
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  SAM_PARAMETER_OVERRIDES="${SAM_PARAMETER_OVERRIDES} GeminiApiKey=${GEMINI_API_KEY}"
  export GEMINI_TIMEOUT_MS="${GEMINI_TIMEOUT_MS:-20000}"
  export GEMINI_MAX_ATTEMPTS="${GEMINI_MAX_ATTEMPTS:-2}"
  echo "[info] GEMINI_API_KEY detected for local SAM (length: ${#GEMINI_API_KEY})."
  echo "[info] Local Gemini settings: timeout=${GEMINI_TIMEOUT_MS}ms attempts=${GEMINI_MAX_ATTEMPTS}."
else
  echo "[info] GEMINI_API_KEY is not set; /recommendations will use deterministic fallback."
fi

SAM_ENV_VARS_FILE="/tmp/psipay-sam-local-env.json"
cat > "${SAM_ENV_VARS_FILE}" <<EOF
{
  "ApiFunction": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY:-}",
    "GEMINI_TIMEOUT_MS": "${GEMINI_TIMEOUT_MS:-}",
    "GEMINI_MAX_ATTEMPTS": "${GEMINI_MAX_ATTEMPTS:-}"
  }
}
EOF

(cd infra/aws-sam && "${SAM_BIN}" local start-api --port "${API_PORT}" --docker-network "${DOCKER_NETWORK}" --parameter-overrides "${SAM_PARAMETER_OVERRIDES}" --env-vars "${SAM_ENV_VARS_FILE}") &

echo "Starting client (Vite)..."
(cd client && npm install --no-bin-links && npm run dev) &

echo "Local services started:"
echo "- API (SAM): http://127.0.0.1:${API_PORT}"
echo "- Client: see Vite output"

wait

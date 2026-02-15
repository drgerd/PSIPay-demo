#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="${1:-}"
REGION="${REGION:-eu-west-2}"
API_BASE_URL="${API_BASE_URL:-}"

if [[ -z "${BUCKET_NAME}" ]]; then
  echo "Usage: $0 <bucket-name>" >&2
  exit 2
fi

cd client

if [[ -n "${API_BASE_URL}" ]]; then
  cat > public/config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}"
}
EOF
fi

npm install
npm run build
aws s3 sync dist "s3://${BUCKET_NAME}" --region "${REGION}" --delete

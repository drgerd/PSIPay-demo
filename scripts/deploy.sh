#!/usr/bin/env bash
set -euo pipefail

# Deploy SAM (Lambda + API + DynamoDB + S3 website) and upload the SPA.
#
# Usage:
#   bash scripts/deploy.sh --stack psipay --bucket <unique-bucket-name>
#

STACK_NAME="psipay"
REGION="${AWS_REGION:-eu-central-1}"
BUCKET_NAME=""
LOGS_RETENTION_DAYS="14"

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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack)
      STACK_NAME="$2"; shift 2 ;;
    --region)
      REGION="$2"; shift 2 ;;
    --bucket)
      BUCKET_NAME="$2"; shift 2 ;;
    --logs-retention-days)
      LOGS_RETENTION_DAYS="$2"; shift 2 ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${BUCKET_NAME}" ]]; then
  echo "Missing --bucket <unique-bucket-name>" >&2
  exit 2
fi

if [[ -f scripts/env.local ]]; then
  # shellcheck disable=SC1091
  source <(tr -d '\r' < scripts/env.local)
fi

echo "Deploying SAM stack '${STACK_NAME}' to ${REGION}..."

(cd infra/aws-sam && "${SAM_BIN}" build)

(cd infra/aws-sam && "${SAM_BIN}" deploy \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --tags psipay=true \
  --parameter-overrides \
    WebsiteBucketName="${BUCKET_NAME}" \
    GeminiApiKey="${GEMINI_API_KEY:-}" \
    LogsRetentionDays="${LOGS_RETENTION_DAYS}" \
  )

API_BASE_URL=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" \
  --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
  --output text)

echo "Building client..."
(npm -w client install --silent --no-bin-links)
(npm -w client run build)

echo "Writing runtime config into dist/config.json"
cat > client/dist/config.json <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}"
}
EOF

echo "Uploading SPA to s3://${BUCKET_NAME}..."
aws s3 sync client/dist "s3://${BUCKET_NAME}" --region "${REGION}" --delete

echo "Done."
echo "- API: ${API_BASE_URL}"
echo "- Website: ${WEBSITE_URL}"

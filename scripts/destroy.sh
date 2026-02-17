#!/usr/bin/env bash
set -euo pipefail

# Delete SAM stack resources (Lambda + API + DynamoDB + S3 website).
#
# Usage:
#   bash scripts/destroy.sh --stack psipay
#

STACK_NAME="psipay"
REGION="${AWS_REGION:-eu-central-1}"

SAM_BIN="$(command -v sam || true)"
if [[ -z "${SAM_BIN}" && -x "/home/${USER}/.local/bin/sam" ]]; then
  SAM_BIN="/home/${USER}/.local/bin/sam"
fi

if [[ -z "${SAM_BIN}" ]]; then
  echo "SAM CLI not found. Install with: pipx install aws-sam-cli" >&2
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack)
      STACK_NAME="$2"; shift 2 ;;
    --region)
      REGION="$2"; shift 2 ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -f scripts/env.local ]]; then
  # shellcheck disable=SC1091
  source <(tr -d '\r' < scripts/env.local)
fi

if ! aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK_NAME}" >/dev/null 2>&1; then
  echo "Stack '${STACK_NAME}' not found in ${REGION}. Nothing to delete."
  exit 0
fi

WEBSITE_BUCKET="$(aws cloudformation describe-stack-resources \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --logical-resource-id WebsiteBucket \
  --query 'StackResources[0].PhysicalResourceId' \
  --output text 2>/dev/null || true)"

if [[ -n "${WEBSITE_BUCKET}" && "${WEBSITE_BUCKET}" != "None" ]]; then
  echo "Emptying S3 bucket s3://${WEBSITE_BUCKET}..."
  aws s3 rm "s3://${WEBSITE_BUCKET}" --region "${REGION}" --recursive || true
fi

echo "Deleting SAM stack '${STACK_NAME}' in ${REGION}..."
"${SAM_BIN}" delete \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --no-prompts

echo "Done."

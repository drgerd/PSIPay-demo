#!/usr/bin/env bash
set -euo pipefail

# Create (or update) a fixed Cognito test user with permanent password.
#
# Usage:
#   bash scripts/bootstrap-cognito-user.sh --stack psipay

STACK_NAME="psipay"
REGION="${AWS_REGION:-eu-central-1}"
USERNAME="psipay_user"
PASSWORD="psipay!12345678"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stack)
      STACK_NAME="$2"; shift 2 ;;
    --region)
      REGION="$2"; shift 2 ;;
    --username)
      USERNAME="$2"; shift 2 ;;
    --password)
      PASSWORD="$2"; shift 2 ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --region "${REGION}" \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" \
  --output text)

if [[ -z "${USER_POOL_ID}" || "${USER_POOL_ID}" == "None" ]]; then
  echo "CognitoUserPoolId output not found for stack '${STACK_NAME}'." >&2
  exit 1
fi

if ! aws cognito-idp admin-get-user --region "${REGION}" --user-pool-id "${USER_POOL_ID}" --username "${USERNAME}" >/dev/null 2>&1; then
  echo "Creating Cognito user '${USERNAME}' in pool '${USER_POOL_ID}'..."
  aws cognito-idp admin-create-user \
    --region "${REGION}" \
    --user-pool-id "${USER_POOL_ID}" \
    --username "${USERNAME}" \
    --message-action SUPPRESS >/dev/null
fi

echo "Setting permanent password for '${USERNAME}'..."
aws cognito-idp admin-set-user-password \
  --region "${REGION}" \
  --user-pool-id "${USER_POOL_ID}" \
  --username "${USERNAME}" \
  --password "${PASSWORD}" \
  --permanent >/dev/null

echo "Done."
echo "- Username: ${USERNAME}"
echo "- Password: ${PASSWORD}"

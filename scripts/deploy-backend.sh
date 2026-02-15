#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-psipay-backend}"
REGION="${REGION:-eu-west-2}"

cd backend
sam build
sam deploy --stack-name "${STACK_NAME}" --region "${REGION}" --guided

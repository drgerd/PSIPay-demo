#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="${1:-}"
REGION="${REGION:-eu-west-2}"

if [[ -z "${BUCKET_NAME}" ]]; then
  echo "Usage: $0 <bucket-name>" >&2
  exit 2
fi

aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${REGION}" --create-bucket-configuration LocationConstraint="${REGION}"

cat > /tmp/psipay_s3_policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket "${BUCKET_NAME}" --policy file:///tmp/psipay_s3_policy.json
aws s3 website "s3://${BUCKET_NAME}/" --index-document index.html --error-document index.html

rm -f /tmp/psipay_s3_policy.json

echo "S3 website enabled: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"

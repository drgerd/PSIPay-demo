Param(
  [Parameter(Mandatory = $true)][string]$BucketName,
  [string]$Region = "eu-west-2"
)

$ErrorActionPreference = "Stop"

aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region

# Public read for static website (MVP). For production, use CloudFront + OAC instead.
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@

$tmp = New-TemporaryFile
Set-Content -Path $tmp -Value $policy -Encoding ASCII

aws s3api put-bucket-policy --bucket $BucketName --policy file://$tmp
aws s3 website s3://$BucketName/ --index-document index.html --error-document index.html

Remove-Item $tmp -Force

Write-Host "S3 website enabled: http://$BucketName.s3-website-$Region.amazonaws.com"

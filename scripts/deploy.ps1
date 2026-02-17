Param(
  [string]$StackName = "psipay",
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "eu-central-1" }),
  [Parameter(Mandatory = $true)][string]$BucketName
)

$ErrorActionPreference = "Stop"

if (Test-Path "scripts/env.local") {
  Get-Content "scripts/env.local" | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*$') { return }
    $parts = $_.Split('=', 2)
    if ($parts.Length -eq 2) {
      $envName = $parts[0].Trim()
      $envVal = $parts[1].Trim()
      if ($envName) { Set-Item -Path "Env:$envName" -Value $envVal }
    }
  }
}

Push-Location "infra/aws-sam"
try {
  sam build
  $gemini = if ($env:GEMINI_API_KEY) { $env:GEMINI_API_KEY } else { "" }
  sam deploy --stack-name $StackName --region $Region --resolve-s3 --capabilities CAPABILITY_IAM --parameter-overrides WebsiteBucketName=$BucketName GeminiApiKey=$gemini
} finally {
  Pop-Location
}

$apiBaseUrl = aws cloudformation describe-stacks --region $Region --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" --output text
$websiteUrl = aws cloudformation describe-stacks --region $Region --stack-name $StackName --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text

Push-Location "client"
try {
  npm install
  npm run build
  $configPath = Join-Path (Get-Location) "dist\config.json"
  $config = "{`n  \"apiBaseUrl\": \"$apiBaseUrl\"`n}`n"
  Set-Content -Path $configPath -Value $config -Encoding ASCII
  aws s3 sync dist "s3://$BucketName" --region $Region --delete
} finally {
  Pop-Location
}

Write-Host "Done."
Write-Host "- API: $apiBaseUrl"
Write-Host "- Website: $websiteUrl"

Param(
  [Parameter(Mandatory = $true)][string]$BucketName,
  [string]$Region = "eu-west-2",
  [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"

Push-Location client
try {
  if ($ApiBaseUrl) {
    $configPath = Join-Path (Get-Location) "public\config.json"
    $config = "{`n  \"apiBaseUrl\": \"$ApiBaseUrl\"`n}`n"
    Set-Content -Path $configPath -Value $config -Encoding ASCII
  }

  npm install
  npm run build
  aws s3 sync dist "s3://$BucketName" --region $Region --delete
} finally {
  Pop-Location
}

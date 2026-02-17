Param(
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "eu-central-1" }),
  [int]$ApiPort = 3000,
  [int]$DdbPort = 8000
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

Write-Host "Starting DynamoDB Local on :$DdbPort..."
$running = (docker ps --format "{{.Names}}" | Select-String -Pattern "^dynamodb-local$")
if (-not $running) {
  docker run -d --rm --name dynamodb-local -p "$DdbPort`:8000" amazon/dynamodb-local | Out-Null
}

Push-Location "infra/aws-sam"
try {
  sam build
  $env:AWS_REGION = $Region
  $env:DYNAMODB_ENDPOINT = "http://127.0.0.1:$DdbPort"
  $env:CACHE_TABLE_NAME = "Cache"
  if (-not $env:AWS_ACCESS_KEY_ID) { $env:AWS_ACCESS_KEY_ID = "dummy" }
  if (-not $env:AWS_SECRET_ACCESS_KEY) { $env:AWS_SECRET_ACCESS_KEY = "dummy" }
  Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", "sam local start-api --port $ApiPort" | Out-Null
} finally {
  Pop-Location
}

Push-Location "client"
try {
  npm install
  npm run dev
} finally {
  Pop-Location
}

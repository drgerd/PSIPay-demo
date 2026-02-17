Param(
  [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "eu-central-1" }),
  [int]$ApiPort = 3000,
  [int]$DdbPort = 8000,
  [string]$CacheTableName = $(if ($env:CACHE_TABLE_NAME) { $env:CACHE_TABLE_NAME } else { "Cache" }),
  [string]$DockerNetwork = $(if ($env:DOCKER_NETWORK) { $env:DOCKER_NETWORK } else { "psipay-local" })
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
$network = docker network ls --format "{{.Name}}" | Select-String -Pattern "^$DockerNetwork$"
if (-not $network) {
  docker network create $DockerNetwork | Out-Null
}

$running = (docker ps --format "{{.Names}}" | Select-String -Pattern "^dynamodb-local$")
if (-not $running) {
  docker run -d --rm --name dynamodb-local --network $DockerNetwork -p "$DdbPort`:8000" amazon/dynamodb-local | Out-Null
}

$env:AWS_REGION = $Region
$env:CACHE_TABLE_NAME = $CacheTableName
# Always use local dummy credentials for DynamoDB Local.
$env:AWS_ACCESS_KEY_ID = "dummy"
$env:AWS_SECRET_ACCESS_KEY = "dummy"
$ddbLocalForHost = "http://127.0.0.1:$DdbPort"

if (Get-Command aws -ErrorAction SilentlyContinue) {
  for ($i = 0; $i -lt 20; $i++) {
    try {
      aws dynamodb list-tables --endpoint-url $ddbLocalForHost | Out-Null
      break
    } catch {
      Start-Sleep -Seconds 1
    }
  }
}

if (Get-Command aws -ErrorAction SilentlyContinue) {
  try {
    aws dynamodb describe-table --table-name $CacheTableName --endpoint-url $ddbLocalForHost | Out-Null
  } catch {
    Write-Host "Creating DynamoDB Local table '$CacheTableName'..."
    aws dynamodb create-table --table-name $CacheTableName --attribute-definitions AttributeName=cacheKey,AttributeType=S --key-schema AttributeName=cacheKey,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url $ddbLocalForHost | Out-Null
    try {
      aws dynamodb update-time-to-live --table-name $CacheTableName --time-to-live-specification "Enabled=true,AttributeName=ttlEpoch" --endpoint-url $ddbLocalForHost | Out-Null
    } catch {
      # ignore if unsupported on local image
    }
  }
}

Push-Location "infra/aws-sam"
try {
  sam build
  $ddbLocalForContainer = "http://dynamodb-local:8000"
  Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", "sam local start-api --port $ApiPort --docker-network $DockerNetwork --parameter-overrides DynamoDbEndpoint=$ddbLocalForContainer" | Out-Null
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

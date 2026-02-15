Param(
  [int]$ApiPort = 3000,
  [int]$DdbPort = 8000
)

$ErrorActionPreference = "Stop"

Write-Host "Starting DynamoDB Local on port $DdbPort..."
docker rm -f dynamodb-local 2>$null | Out-Null
docker run -d --rm -p "$DdbPort:8000" --name dynamodb-local amazon/dynamodb-local | Out-Null

Write-Host "Starting SAM local API on port $ApiPort..."
$env:DYNAMODB_ENDPOINT = "http://localhost:$DdbPort"
$env:AWS_REGION = $env:AWS_REGION ? $env:AWS_REGION : "eu-west-2"
$env:AWS_ACCESS_KEY_ID = $env:AWS_ACCESS_KEY_ID ? $env:AWS_ACCESS_KEY_ID : "local"
$env:AWS_SECRET_ACCESS_KEY = $env:AWS_SECRET_ACCESS_KEY ? $env:AWS_SECRET_ACCESS_KEY : "local"
$env:CACHE_TABLE_NAME = $env:CACHE_TABLE_NAME ? $env:CACHE_TABLE_NAME : "Cache"
$env:ONS_CPIH_VERSION = $env:ONS_CPIH_VERSION ? $env:ONS_CPIH_VERSION : "66"
$env:DEFAULT_HISTORY_MONTHS = $env:DEFAULT_HISTORY_MONTHS ? $env:DEFAULT_HISTORY_MONTHS : "12"

Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", "cd backend; sam build; sam local start-api --port $ApiPort" | Out-Null

Write-Host "Starting client (Vite)..."
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", "cd client; npm install; npm run dev" | Out-Null

Write-Host "\nLocal services started:"
Write-Host "- DynamoDB Local: http://localhost:$DdbPort"
Write-Host "- API (SAM local): http://127.0.0.1:$ApiPort"
Write-Host "- Client: see Vite output in its window"
Write-Host "\nStop: docker rm -f dynamodb-local (and stop the sam/vite processes)"

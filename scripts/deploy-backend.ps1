Param(
  [string]$StackName = "psipay-backend",
  [string]$Region = "eu-west-2"
)

$ErrorActionPreference = "Stop"

Push-Location backend
try {
  sam build
  sam deploy --stack-name $StackName --region $Region --guided
} finally {
  Pop-Location
}

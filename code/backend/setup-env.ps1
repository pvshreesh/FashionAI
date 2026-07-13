# Create .env from template if it doesn't exist
# Your real credentials stay in .env (gitignored) and are never committed

$envFile = Join-Path $PSScriptRoot ".env"
$exampleFile = Join-Path $PSScriptRoot ".env.example"

if (-not (Test-Path $exampleFile)) {
    Write-Host "Error: .env.example not found" -ForegroundColor Red
    exit 1
}

if (Test-Path $envFile) {
    Write-Host ".env already exists - your credentials are in place" -ForegroundColor Green
    exit 0
}

Copy-Item $exampleFile $envFile
Write-Host "Created .env from template." -ForegroundColor Green
Write-Host "Edit code/backend/.env and add your real Cognito, DynamoDB, S3, and Gemini values." -ForegroundColor Yellow
Write-Host "Never commit .env - it is gitignored." -ForegroundColor Cyan

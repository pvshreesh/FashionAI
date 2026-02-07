# Download Ollama Models
# Run this after Ollama is installed

$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

if (-not (Test-Path $ollamaPath)) {
    Write-Host "ERROR: Ollama not found. Please install Ollama first." -ForegroundColor Red
    exit 1
}

Write-Host "`nDownloading Ollama models for Fashion App..." -ForegroundColor Cyan
Write-Host "This will download ~10GB (takes 5-10 minutes)`n" -ForegroundColor Yellow

# Check service
Write-Host "Checking Ollama service..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
try {
    $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
    Write-Host "Ollama service is running!`n" -ForegroundColor Green
} catch {
    Write-Host "Starting Ollama service..." -ForegroundColor Yellow
    Start-Process $ollamaPath -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

# Download chat model
Write-Host "[1/2] Downloading llama3.3:8b (chat model)..." -ForegroundColor Cyan
& $ollamaPath pull llama3.3:8b

# Download vision model  
Write-Host "`n[2/2] Downloading llava:1.6 (vision model)..." -ForegroundColor Cyan
& $ollamaPath pull llava:1.6

# List models
Write-Host "`nInstalled models:" -ForegroundColor Cyan
& $ollamaPath list

Write-Host "`nSetup complete!`n" -ForegroundColor Green
Write-Host "Next: Update .env with AI_PROVIDER=ollama" -ForegroundColor Yellow

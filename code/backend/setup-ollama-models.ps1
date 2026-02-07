# Setup Ollama Models Script
# This will download the required models for the fashion app

Write-Host "`nSetting up Ollama models for Fashion App..." -ForegroundColor Cyan
Write-Host "This will download ~10GB of models (takes 5-10 minutes)`n" -ForegroundColor Yellow

# Check if Ollama is installed
try {
    $version = ollama --version
    Write-Host "Ollama version: $version" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Ollama is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Ollama first: https://ollama.com/download/windows" -ForegroundColor Yellow
    exit 1
}

# Check if Ollama service is running
Write-Host "`nChecking Ollama service..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
    Write-Host "Ollama service is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Ollama service not responding. It may still be starting..." -ForegroundColor Yellow
    Write-Host "Waiting 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Pull chat model
Write-Host "`n[1/2] Downloading Llama 3.3 8B (chat model)..." -ForegroundColor Cyan
Write-Host "This may take several minutes...`n" -ForegroundColor Yellow
ollama pull llama3.3:8b

# Pull vision model
Write-Host "`n[2/2] Downloading LLaVA 1.6 7B (vision model)..." -ForegroundColor Cyan
Write-Host "This may take several minutes...`n" -ForegroundColor Yellow
ollama pull llava:1.6

# List installed models
Write-Host "`nInstalled models:" -ForegroundColor Cyan
ollama list

Write-Host "`nSetup complete! Models are ready to use." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Test chat: ollama run llama3.3:8b 'What should I wear to a wedding?'" -ForegroundColor White
Write-Host "  2. Update .env: Set AI_PROVIDER=ollama" -ForegroundColor White
Write-Host "  3. Restart backend server" -ForegroundColor White

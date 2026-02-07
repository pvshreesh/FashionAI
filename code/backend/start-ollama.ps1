# Quick script to start Ollama service

$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

if (-not (Test-Path $ollamaPath)) {
    Write-Host "ERROR: Ollama not found at $ollamaPath" -ForegroundColor Red
    Write-Host "Please install Ollama first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking Ollama service..." -ForegroundColor Cyan

# Check if already running
try {
    $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 2
    Write-Host "Ollama is already running!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Starting Ollama service..." -ForegroundColor Yellow
    Start-Process $ollamaPath -WindowStyle Hidden
    Start-Sleep -Seconds 3
    
    # Verify it started
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
        Write-Host "Ollama service started successfully!" -ForegroundColor Green
        
        Write-Host "`nInstalled models:" -ForegroundColor Cyan
        & $ollamaPath list
    } catch {
        Write-Host "WARNING: Ollama may still be starting. Wait a few seconds and try again." -ForegroundColor Yellow
    }
}

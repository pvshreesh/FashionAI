# Ollama Installation Script for Windows
# Run this in PowerShell as Administrator

Write-Host "🚀 Installing Ollama..." -ForegroundColor Cyan

# Check if Ollama is already installed
$ollamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

if ($ollamaInstalled) {
    Write-Host "✅ Ollama is already installed!" -ForegroundColor Green
    Write-Host "Version: $(ollama --version)" -ForegroundColor Yellow
} else {
    Write-Host "📥 Installing Ollama..." -ForegroundColor Yellow
    
    # Try winget first
    try {
        Write-Host "Attempting to install via winget..." -ForegroundColor Cyan
        winget install Ollama.Ollama --accept-package-agreements --accept-source-agreements
        Write-Host "✅ Ollama installed via winget!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  winget installation failed. Please install manually:" -ForegroundColor Yellow
        Write-Host "   1. Download from: https://ollama.com/download/windows" -ForegroundColor White
        Write-Host "   2. Run the installer" -ForegroundColor White
        exit 1
    }
}

# Wait a moment for service to start
Start-Sleep -Seconds 3

# Check if Ollama service is running
Write-Host "`n🔍 Checking Ollama service..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Ollama is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama service not responding. It may still be starting..." -ForegroundColor Yellow
    Write-Host "   Try: ollama list" -ForegroundColor White
}

# Show next steps
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Pull chat model: ollama pull llama3.3:8b" -ForegroundColor White
Write-Host "   2. Pull vision model: ollama pull llava:1.6" -ForegroundColor White
Write-Host "   3. Test: ollama run llama3.3:8b 'Hello'" -ForegroundColor White
Write-Host "`nInstallation complete!" -ForegroundColor Green

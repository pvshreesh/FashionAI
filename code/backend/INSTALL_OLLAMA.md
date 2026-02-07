# Installing Ollama on Windows

## Step-by-Step Installation

### Method 1: Direct Download (Recommended)

1. **Download Ollama:**
   - Go to: https://ollama.com/download/windows
   - Download the Windows installer
   - Or direct link: https://ollama.com/download/OllamaSetup.exe

2. **Run Installer:**
   - Double-click `OllamaSetup.exe`
   - Follow the installation wizard
   - It will install Ollama and add it to your PATH

3. **Verify Installation:**
   ```bash
   ollama --version
   ```

### Method 2: Using winget (Windows Package Manager)

```bash
winget install Ollama.Ollama
```

### Method 3: Using Chocolatey

```bash
choco install ollama
```

---

## After Installation

### 1. Start Ollama Service

Ollama should start automatically as a Windows service. If not:

```bash
# Check if running
ollama list

# If not running, start it manually
# Ollama runs automatically, but you can verify:
```

### 2. Pull Required Models

```bash
# Chat model (for recommendations, chat)
ollama pull llama3.3:8b

# Vision model (for image analysis)
ollama pull llava:1.6

# This will download ~10GB of models
# Takes 5-10 minutes depending on internet speed
```

### 3. Test Models

```bash
# Test chat model
ollama run llama3.3:8b "What should I wear to a wedding?"

# Test vision model (with image)
ollama run llava:1.6 "Describe this clothing item" --image path/to/image.jpg
```

### 4. Verify API is Running

Ollama runs a local API server on `http://localhost:11434`

Test it:
```bash
curl http://localhost:11434/api/tags
```

Or in browser: http://localhost:11434/api/tags

---

## Troubleshooting

### Ollama not starting?
- Check Windows Services: `services.msc` → Look for "Ollama"
- Restart service if needed
- Or run manually: `ollama serve`

### Models not downloading?
- Check internet connection
- Check disk space (need ~10GB free)
- Try: `ollama pull llama3.3:8b --verbose`

### GPU not detected?
- Make sure NVIDIA drivers are up to date
- Ollama should auto-detect RTX 4070
- Check: `ollama ps` (shows GPU usage)

### Port 11434 already in use?
- Another instance might be running
- Check: `netstat -ano | findstr :11434`
- Kill process if needed

---

## Next Steps

After installation:
1. ✅ Verify Ollama is running
2. ✅ Pull models (llama3.3:8b and llava:1.6)
3. ✅ Test models work
4. ✅ Update backend to use Ollama (I'll help with this)

---

**Ready to install?** Let me know when done and I'll help integrate it! 🚀

# Ollama Installation Guide - Windows

## ✅ Installation Status

Ollama has been downloaded and installed via winget. However, you may need to **restart your terminal** for it to be available in PATH.

## Next Steps

### Step 1: Restart Terminal/PowerShell

**Close and reopen** your terminal/PowerShell window, or:
- Open a **new** PowerShell/Command Prompt window
- This refreshes the PATH environment variable

### Step 2: Verify Installation

```bash
ollama --version
```

You should see something like: `ollama version is 0.14.3`

### Step 3: Check Ollama Service

```bash
ollama list
```

This should show an empty list (no models yet) or connect to the service.

### Step 4: Download Required Models

**Chat Model (for recommendations, chat):**
```bash
ollama pull llama3.3:8b
```
- Size: ~4.7GB
- Time: 5-10 minutes (depending on internet)

**Vision Model (for image analysis):**
```bash
ollama pull llava:1.6
```
- Size: ~4.5GB  
- Time: 5-10 minutes

**Total download:** ~10GB

### Step 5: Test Models

**Test chat:**
```bash
ollama run llama3.3:8b "What should I wear to a wedding?"
```

**Test vision (with image):**
```bash
ollama run llava:1.6 "Describe this clothing item" --image path/to/image.jpg
```

---

## Alternative: Manual Installation

If winget installation didn't work:

1. **Download directly:**
   - Go to: https://ollama.com/download/windows
   - Download `OllamaSetup.exe`
   - Run the installer
   - Restart terminal

2. **Or use Chocolatey:**
   ```bash
   choco install ollama
   ```

---

## Troubleshooting

### "ollama is not recognized"
- **Solution**: Restart your terminal/PowerShell
- Or manually add to PATH (usually `C:\Users\<username>\AppData\Local\Programs\Ollama`)

### Ollama service not starting
- Check Windows Services: `services.msc` → Look for "Ollama"
- Or run manually: `ollama serve`

### Models not downloading
- Check internet connection
- Check disk space (need ~10GB free)
- Try: `ollama pull llama3.3:8b --verbose`

### GPU not detected
- Make sure NVIDIA drivers are up to date
- Ollama should auto-detect RTX 4070
- Check GPU usage: `ollama ps`

---

## Quick Setup Script

I've created `setup-ollama-models.ps1` in the backend folder.

Run it after Ollama is installed:
```bash
cd c:\project\code\backend
powershell -ExecutionPolicy Bypass -File setup-ollama-models.ps1
```

---

## After Models Are Installed

1. Update `.env` file:
   ```
   AI_PROVIDER=ollama
   ```

2. Restart backend server

3. Test the API - it will now use local LLM instead of Gemini!

---

**Once Ollama is working, let me know and I'll help you switch the backend to use it!** 🚀

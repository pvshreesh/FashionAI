# Quick Start: Using Ollama

## ✅ Ollama is Installed!

Ollama is installed at: `C:\Users\<username>\AppData\Local\Programs\Ollama\ollama.exe`

## Download Models (Required)

**Option 1: Use the script**
```bash
cd c:\project\code\backend
powershell -ExecutionPolicy Bypass -File download-models.ps1
```

**Option 2: Manual download**
```bash
# In PowerShell (use full path if not in PATH):
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull llama3.3:8b
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull llava:1.6
```

**Option 3: After restarting terminal (if in PATH)**
```bash
ollama pull llama3.3:8b
ollama pull llava:1.6
```

## Verify Installation

```bash
# Check version
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" --version

# List models (after downloading)
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list

# Test chat
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" run llama3.3:8b "Hello"
```

## Switch Backend to Ollama

1. **Update `.env` file:**
   ```
   AI_PROVIDER=ollama
   ```

2. **Restart backend server**

3. **Test** - API will now use local LLM!

---

**Models are downloading in the background. This takes 5-10 minutes.** ⏳

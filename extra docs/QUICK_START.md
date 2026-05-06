# Quick Start Guide - After Restarting

## Step 1: Start Ollama Service

**Option 1: Automatic (PowerShell)**
```bash
cd c:\project\code\backend
powershell -ExecutionPolicy Bypass -File start-ollama.ps1
```

**Option 2: Manual**
```bash
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" serve
```
(Or just open Ollama from Start Menu - it runs automatically)

**Option 3: Check if already running**
```bash
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```
If you see your models, Ollama is running!

---

## Step 2: Verify Models Are Installed

```bash
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

You should see:
- `llama3:8b` (chat model)
- `llava:latest` (vision model)

If models are missing, download them:
```bash
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull llama3:8b
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull llava
```

---

## Step 3: Start Backend Server

```bash
cd c:\project\code\backend
npm start
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Server running on port 3000
```

---

## Step 4: Test the App

1. Open `http://localhost:3000/app` in your browser
2. Try uploading an image in the Wardrobe tab
3. Try chatting in the Chat tab

---

## Troubleshooting

### "Ollama is not running"
- Run: `powershell -ExecutionPolicy Bypass -File start-ollama.ps1`
- Or manually start Ollama from Start Menu

### "Models not found"
- Models are stored locally, they should still be there
- Check with: `ollama list`
- If missing, re-download (see Step 2)

### "Server not connected"
- Make sure backend is running: `npm start` in `code/backend`
- Check port 3000 is not in use

### "AI not responding"
- Check `.env` has `AI_PROVIDER=ollama`
- Verify Ollama is running: `ollama list`
- Check backend logs for errors

---

**That's it! You're ready to go!** 🚀

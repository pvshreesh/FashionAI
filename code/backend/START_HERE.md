# 🚀 Quick Start - After Restarting Computer

## ✅ Status Check

**Ollama:** ✅ Running (models are installed)  
**Backend:** ⏳ Starting...

---

## What You Need to Do

### 1. Start Backend Server

Open a terminal in `c:\project\code\backend` and run:

```bash
npm start
```

You should see:
```
✅ MongoDB Connected: ...
🚀 Server running on port 3000
```

**Note:** If MongoDB isn't connected, that's OK for MVP - the app will still work!

---

### 2. Open the Prototype

Open `c:\project\code\prototype\index.html` in your browser.

---

### 3. Test It!

- **Wardrobe Tab:** Upload clothing images
- **Chat Tab:** Ask fashion questions
- **Recommendations:** Get outfit suggestions

---

## Quick Commands

**Check Ollama:**
```bash
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

**Start Ollama (if not running):**
```bash
powershell -ExecutionPolicy Bypass -File start-ollama.ps1
```

**Start Backend:**
```bash
cd c:\project\code\backend
npm start
```

---

## Current Configuration

- **AI Provider:** Ollama (local LLM)
- **Chat Model:** llama3:8b
- **Vision Model:** llava:latest
- **Backend Port:** 3000
- **Ollama Port:** 11434

---

**Everything is ready! Just start the backend server!** 🎉

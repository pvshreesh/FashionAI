# 🚀 How to Start the Prototype

## Quick Start

**Option 1: Using http-server (Recommended)**
```bash
cd c:\project\code\prototype
http-server -p 8000
```
Then open: **http://localhost:8000/index.html**

**Option 2: Using Python**
```bash
cd c:\project\code\prototype
python -m http.server 8000
```
Then open: **http://localhost:8000/index.html**

---

## Before Starting

Make sure both services are running:

1. **Ollama Service:**
   ```bash
   & "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
   ```
   (Should show your models)

2. **Backend Server:**
   ```bash
   cd c:\project\code\backend
   npm start
   ```
   (Should show "Server running on port 3000")

---

## What You'll See

- **Port 8000:** Prototype web interface (http-server)
- **Port 3000:** Backend API server
- **Port 11434:** Ollama service

---

## Troubleshooting

**"Cannot GET /"**
- Make sure you're in the `prototype` folder
- Check the server is running on port 8000

**"Failed to fetch" or "Failed to get wardrobe"**
- Make sure backend is running on port 3000 (`cd backend && npm start`)
- Open the prototype from **http://localhost:8000** (not by double-clicking the HTML file). Use `npx http-server -p 8000` in the prototype folder, then visit http://localhost:8000
- Check MongoDB is running (for wardrobe to load)

**"Ollama not responding"**
- Start Ollama: `powershell -ExecutionPolicy Bypass -File start-ollama.ps1`
- Or manually start Ollama from Start Menu

---

**That's it! Open http://localhost:8000/index.html in your browser!** 🎉

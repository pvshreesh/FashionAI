# Run the Server

## Quick start

```powershell
cd c:\project\code\backend
npm start
```

Server runs on **http://localhost:3000**.

## What's required (Gemini mode)

- **Node.js** – backend
- **Gemini API key** – in `.env` as `GEMINI_API_KEY`
- **MongoDB** – optional for now; when connected, clothes are stored and persist

No need to run Ollama when using Gemini (`AI_PROVIDER=gemini`).

## Test

- Health: http://localhost:3000/health
- Prototype: open `code/prototype/index.html` in your browser

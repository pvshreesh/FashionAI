# Limiting Ollama RAM Usage

If Ollama uses too much RAM and your laptop freezes, use these settings.

## 1. In this app (`.env`)

- **OLLAMA_NUM_CTX=2048** – Context size in tokens. Lower = less RAM. Default in app is 2048. Try **1024** if it still uses too much.
- **OLLAMA_NUM_THREAD** – (optional) Limit CPU threads, e.g. `4`.
- **OLLAMA_NUM_GPU** – (optional) Limit GPU layers; more on CPU = less VRAM, more system RAM.

## 2. When starting Ollama (system-wide)

Set these **before** starting Ollama (environment variables for the Ollama process):

| Variable | Effect |
|----------|--------|
| **OLLAMA_MAX_VRAM** | Max VRAM in bytes, e.g. `6000000000` = ~6 GB. Stops Ollama using all GPU memory. |
| **OLLAMA_MAX_LOADED_MODELS** | Keep at `1` so only one model is loaded. |
| **OLLAMA_NUM_PARALLEL** | Keep at `1` to avoid loading multiple requests at once. |

### Windows (PowerShell, before running Ollama)

```powershell
$env:OLLAMA_MAX_VRAM = "6000000000"   # 6 GB VRAM max
$env:OLLAMA_MAX_LOADED_MODELS = "1"
ollama serve
```

Or set them in **System Properties → Environment Variables** so they apply whenever Ollama starts.

### macOS / Linux

```bash
export OLLAMA_MAX_VRAM=6000000000
export OLLAMA_MAX_LOADED_MODELS=1
ollama serve
```

Or for systemd: `systemctl edit ollama.service` and add under `[Service]`:

```
Environment=OLLAMA_MAX_VRAM=6000000000
Environment=OLLAMA_MAX_LOADED_MODELS=1
```

Then: `systemctl daemon-reload && systemctl restart ollama`.

## 3. Use smaller models

- **Chat:** `llama3:8b` is already moderate. For less RAM, try `llama3.2:3b` or `phi3:mini`.
- **Vision:** `llava` is common; smaller alternatives exist (e.g. `llava:7b` vs larger variants).
- Pull smaller models: `ollama pull llama3.2:3b`

## Summary

1. Set **OLLAMA_NUM_CTX=2048** (or 1024) in `code/backend/.env`.
2. Set **OLLAMA_MAX_VRAM** when starting Ollama so it doesn’t use all GPU RAM.
3. Use smaller models if needed.

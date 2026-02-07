# Switched to Gemini API

## What Changed

- **AI Provider**: `AI_PROVIDER=gemini` in `.env`
- All AI features (chat, image analysis, recommendations, rating) now use **Google Gemini API** instead of Ollama.

## No Code Changes Required

The app already supports both providers. Flipping `AI_PROVIDER` to `gemini` is enough. Restart the backend to apply:

```bash
cd code/backend
npm start
```

## Image Generation with Gemini (future)

Gemini supports **image generation** (e.g. `gemini-2.5-flash-image`). Your existing API key may support it depending on your Google AI Studio / Cloud setup.

When you want to add it:
1. Check [Google AI Gemini image generation docs](https://ai.google.dev/gemini-api/docs) for the right model name and API.
2. Add a new route, e.g. `POST /api/ai/generate-image`, that calls the image-generation model with a text prompt.
3. Return the generated image (e.g. as base64 or URL) in the response.

Ollama remains available: set `AI_PROVIDER=ollama` in `.env` if you want to use local models again.

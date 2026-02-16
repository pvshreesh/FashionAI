# Gemini API – Image Generation Limits (Free Tier)

Reference for the try-on feature when using Gemini for image generation.

## Free tier (approx. Dec 2025 / Jan 2026)

| Limit | Value |
|-------|--------|
| **Daily** | ~500 images/day (e.g. `gemini-2.5-flash-image` / preview) |
| **Rate** | ~15 requests per minute (RPM) |
| **Output size** | Often 1024×1024 (1K) on free tier |
| **Reset** | Quotas typically reset at **midnight UTC** |

## Notes

- **Dynamic throttling:** In high demand, the daily limit may be lower.
- **API vs app:** These limits apply to the **API** (e.g. this backend). The consumer app (gemini.google.com) has different, usually stricter limits.
- **Model:** `gemini-2.5-flash-image` is the main free, high-volume image model.
- **When exceeded:** The API returns **429 (Too Many Requests)**. The response may include a “retry after” delay.

## In this project

- Try-on calls **Gemini first**, then **Ollama** on failure (quota, 429, or other errors).
- Input images are resized (see `TRY_ON_IMAGE_MAX_DIM`, default 512) to reduce tokens and stay within limits.
- To use **only Ollama** for try-on and avoid hitting Gemini at all, set `TRY_ON_AI_PROVIDER=ollama` (and ensure Ollama + image model are set up).

# Backend Setup Guide

## ✅ Current Status

The backend uses **Gemini only** for all AI features: chat, image analysis, recommendations, style rating, and virtual try-on.

## ✅ API Key Configuration

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or get your API key
3. Copy `code/backend/.env.example` to `code/backend/.env`
4. Set `GEMINI_API_KEY=your_key_here` in `.env`

Or run: `node setup-env.js` (or `.\setup-env.ps1` on Windows) to create `.env` from the template.

## 🚀 Starting the Server

```bash
cd code/backend
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## 📝 API Endpoints

- `POST /api/ai/chat` - AI fashion chat assistant
- `POST /api/ai/try-on` - Virtual try-on (garment + user photo)
- `POST /api/ai/analyze-image` - Clothing image analysis
- `POST /api/ai/recommendations` - Outfit recommendations from wardrobe
- `POST /api/ai/rate-item` - Style rating for items

## 🔧 Optional: Model Configuration

Edit `.env` to override defaults:
- `GEMINI_CHAT_MODEL` – default: `gemini-1.5-flash`
- `GEMINI_VISION_MODEL` – default: `gemini-1.5-flash`
- `GEMINI_VISION_MAX_DIM` – max image dimension for vision (default: 1024)

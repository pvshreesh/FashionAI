# Backend Setup Guide

## ✅ Current Status

The backend code is fully set up and ready! All Gemini API integration code is in place.

## ✅ API Key Configuration

**Using Google AI Studio API Key** (Recommended - Works immediately!)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Get your API key (works immediately, no setup needed)
3. Add to `.env` file: `GEMINI_API_KEY=your_key_here`

**Note**: Google AI Studio API keys work directly without enabling any APIs in Google Cloud Console.

### Current Model Configuration

The app is configured to use:
- **gemini-2.5-flash** - Fast, cost-effective (recommended for MVP)
- **gemini-2.5-pro** - Better quality (can switch in `src/config/gemini.js`)

Available models with Google AI Studio:
- `gemini-2.5-flash` (recommended)
- `gemini-2.5-pro`
- `gemini-2.0-flash`

## 🚀 Starting the Server

Once the API is enabled:

```bash
cd backend
npm run dev
```

Server will start on `http://localhost:3000`

## 🧪 Test the Connection

```bash
node test-gemini.js
```

## 📝 API Endpoints Ready

All endpoints are implemented and ready to use:

- ✅ `POST /api/ai/chat` - AI chat assistant
- ✅ `POST /api/ai/analyze-image` - Clothing image analysis
- ✅ `POST /api/ai/recommendations` - Outfit recommendations
- ✅ `POST /api/ai/rate-item` - Style rating

## 🔧 Model Configuration

Currently using `gemini-1.5-flash` (fast and cost-effective for MVP).

To change models, edit `src/config/gemini.js`:
- `gemini-1.5-flash` - Fast, cheaper (recommended for MVP)
- `gemini-1.5-pro` - Better quality, more expensive

## 📚 Next Steps

1. Enable Generative AI API in Google Cloud
2. Test the connection
3. Start building the mobile app
4. Add database integration
5. Add user authentication

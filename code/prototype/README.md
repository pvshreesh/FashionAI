# Fashion App Prototype

A simple web-based prototype to test and demonstrate the backend API functionality.

## How to Use

1. **Start the backend server**:
   ```bash
   cd ../backend
   npm run dev
   ```

2. **Open the prototype**:
   - Open `index.html` in your web browser
   - Or use a local server: `python -m http.server 8000` then visit `http://localhost:8000`

## Features Demonstrated

### 💬 AI Chat
- Chat with the AI fashion assistant
- Ask questions about fashion, styling, etc.
- Real-time responses from Gemini API

### 👔 Wardrobe
- Add items to wardrobe (with optional image)
- View wardrobe items
- AI auto-tagging when image is uploaded

### ✨ Recommendations
- Get outfit recommendations based on occasion
- Specify body shape and weather
- Uses sample wardrobe for demo

### 🔍 Analyze Image
- Upload clothing image
- Get AI-powered analysis and tags
- Automatic item type, color, style detection

## Notes

- This is a **prototype/demo** - not the final mobile app
- Some features require authentication (wardrobe management)
- For full functionality, register/login first via API
- Image uploads work but images are stored as base64 (temporary)

## API Endpoints Tested

- `GET /health` - Server status
- `POST /api/ai/chat` - AI chat
- `POST /api/ai/analyze-image` - Image analysis
- `POST /api/ai/recommendations` - Outfit recommendations
- `POST /api/wardrobe` - Add wardrobe item (requires auth in production)

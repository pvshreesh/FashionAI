# Fashion App Backend

Backend API server for the AI Fashion Stylist app.

## Features

- ✅ Gemini AI integration for chat, image analysis, and recommendations
- ✅ RESTful API endpoints
- ✅ Image upload support
- ✅ CORS enabled for mobile app

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env` from parent directory (already configured with API key)
   - Or create `.env` file with:
     ```
     GEMINI_API_KEY=your_api_key_here
     PORT=3000
     NODE_ENV=development
     ```

3. **Start server:**
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /health
```

### AI Chat
```
POST /api/ai/chat
Body: {
  "message": "What should I wear to a wedding?",
  "wardrobeContext": [...], // optional
  "conversationHistory": [...] // optional
}
```

### Analyze Clothing Image
```
POST /api/ai/analyze-image
Content-Type: multipart/form-data
Body: {
  "image": <file>
}
```

### Get Outfit Recommendations
```
POST /api/ai/recommendations
Body: {
  "wardrobeItems": [
    {
      "name": "Blue Jeans",
      "tags": ["pants", "casual", "blue"]
    }
  ],
  "occasion": "date",
  "bodyShape": "Hourglass", // optional
  "weather": "warm" // optional
}
```

### Rate Clothing Item
```
POST /api/ai/rate-item
Content-Type: multipart/form-data
Body: {
  "itemDescription": "Blue denim jacket",
  "bodyShape": "Rectangle", // optional
  "image": <file> // optional
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── gemini.js          # Gemini API configuration
│   ├── services/
│   │   └── geminiService.js   # AI service functions
│   ├── routes/
│   │   └── aiRoutes.js        # API routes
│   └── index.js              # Server entry point
├── package.json
└── README.md
```

## Testing

Test the API using curl or Postman:

```bash
# Health check
curl http://localhost:3000/health

# Chat
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What colors suit me best?"}'
```

## Next Steps

- [ ] Add database integration (MongoDB/PostgreSQL)
- [ ] Add user authentication
- [ ] Add wardrobe management endpoints
- [ ] Add caching (Redis)
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add comprehensive error handling

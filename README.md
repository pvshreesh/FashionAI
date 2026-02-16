# Fashion AI — Backend Express

A backend Node.js/Express API for Fashion AI that enables AI-powered fashion styling, virtual try-on, and wardrobe management using Google's Gemini AI.

## Features

- **AI Fashion Chat** — Get styling advice and fashion tips via natural language
- **Virtual Try-On** — Generate professional fashion photos by combining a garment image with a person photo using Gemini
- **Clothing Image Analysis** — Upload clothing images; AI extracts tags, colors, style, occasions, and more
- **Outfit Recommendations** — Get personalized outfit suggestions from your wardrobe for any occasion
- **Style Rating** — AI-powered ratings for versatility, trendiness, and quality
- **Personal Wardrobe Management** — Add, organize, search, and manage your digital closet
- **MongoDB Integration** — Persistent storage for wardrobe items (optional)
- **REST API** — Complete RESTful API with JSON responses

## Setup

### Prerequisites

- Node.js 18+
- [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)
- MongoDB Atlas or local MongoDB (optional, for persisting wardrobe)

### Installation

Install dependencies:

```bash
cd code/backend
npm install
```

Set up environment variables:

```bash
npm run setup   # Creates .env from template
# Edit .env and add:
# GEMINI_API_KEY=your_gemini_api_key
# DATABASE_URL=mongodb+srv://...  (optional)
```

Configure services:

- **Gemini API**: Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **MongoDB**: Optional. Set up [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for wardrobe persistence. See `docs/DATABASE_SETUP.md`

### Running the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

---

## API Endpoints

### Health Check Endpoints

#### GET /

Basic health check and API info.

**Curl Command:**

```bash
curl http://localhost:3000/
```

**Response:**

```json
{
  "message": "Fashion App API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "chat": "POST /api/ai/chat",
    "tryOn": "POST /api/ai/try-on (image + auth for profile photo)",
    "analyzeImage": "POST /api/ai/analyze-image",
    "recommendations": "POST /api/ai/recommendations",
    "rateItem": "POST /api/ai/rate-item"
  }
}
```

#### GET /health

Detailed health check.

**Curl Command:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "message": "Fashion App API is running",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "database": "connected"
}
```

---

### AI Services

#### POST /api/ai/chat

Chat with the AI fashion assistant. Optionally includes wardrobe context for personalized advice.

**Parameters (JSON body):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Your message to the AI |
| `wardrobeContext` | array | No | Wardrobe items for context (or auto-fetched from DB if connected) |
| `conversationHistory` | array | No | Previous messages for context |

**Curl Command:**

```bash
curl -X POST "http://localhost:3000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What colors go well with navy blue?"}'
```

**Response:**

```json
{
  "success": true,
  "message": "Navy blue pairs beautifully with...",
  "usage": {}
}
```

#### POST /api/ai/try-on

Generate a virtual try-on image: person wearing the garment. Send garment image and user photo as form data.

**Parameters (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Garment/clothing image |
| `userPhoto` | file | Yes* | User's full-body or upper-body photo |
| `userPhotoBase64` | string | Yes* | Alternative: base64 user photo |

*One of `userPhoto` or `userPhotoBase64` required. Add your photo in the Profile tab of the prototype first, or send via form.

**Curl Command:**

```bash
curl -X POST "http://localhost:3000/api/ai/try-on" \
  -F "image=@/path/to/garment.jpg" \
  -F "userPhoto=@/path/to/your_photo.jpg"
```

**Response:**

```json
{
  "success": true,
  "image": "data:image/jpeg;base64,...",
  "message": "Here's how you'd look!"
}
```

#### POST /api/ai/analyze-image

Analyze a clothing image and extract tags, colors, style, occasion, etc.

**Parameters (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Clothing image to analyze |

**Curl Command:**

```bash
curl -X POST "http://localhost:3000/api/ai/analyze-image" \
  -F "image=@/path/to/shirt.jpg"
```

**Response:**

```json
{
  "success": true,
  "tags": {
    "name": "Blue Denim Jacket",
    "itemType": "jacket",
    "color": "blue",
    "style": "casual",
    "occasion": ["casual", "date"],
    "tags": ["denim", "jacket", "blue"]
  },
  "rawResponse": "..."
}
```

#### POST /api/ai/recommendations

Get outfit recommendations from your wardrobe for a given occasion.

**Parameters (JSON body):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wardrobeItems` | array | Yes* | Wardrobe items (or use `useDatabase: true` when authenticated) |
| `occasion` | string | Yes | e.g. "casual date night", "business meeting" |
| `bodyShape` | string | No | Rectangle, Apple, Pear, Hourglass, Inverted Triangle |
| `weather` | string | No | e.g. "warm", "rainy" |

**Curl Command:**

```bash
curl -X POST "http://localhost:3000/api/ai/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "wardrobeItems": [
      {"name": "Navy Blazer", "tags": ["formal", "jacket"], "itemType": "jacket"},
      {"name": "White Shirt", "tags": ["casual", "shirt"], "itemType": "shirt"}
    ],
    "occasion": "business meeting"
  }'
```

**Response:**

```json
{
  "success": true,
  "outfits": [
    {
      "items": ["Navy Blazer", "White Shirt"],
      "reasoning": "Classic professional look...",
      "stylingTips": "Pair with dark trousers..."
    }
  ],
  "rawResponse": "..."
}
```

#### POST /api/ai/rate-item

Rate a clothing item on versatility, trendiness, quality.

**Parameters (multipart/form-data or JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemDescription` | string | Yes* | Text description of the item |
| `bodyShape` | string | No | For body-shape compatibility scoring |
| `image` | file | No | Item image (improves rating accuracy) |

*Either `itemDescription` or `image` required.

**Curl Command:**

```bash
curl -X POST "http://localhost:3000/api/ai/rate-item" \
  -F "itemDescription=Blue cotton blazer" \
  -F "bodyShape=Rectangle"
```

**Response:**

```json
{
  "success": true,
  "rating": {
    "versatility": 8,
    "trendiness": 7,
    "quality": 8
  },
  "rawResponse": "..."
}
```

---

### Wardrobe Management

#### GET /api/wardrobe

Get all wardrobe items. Supports pagination, filtering, search.

**Parameters (query):**

| Field | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `limit` | int | Items per page (default: 20) |
| `filter` | JSON string | Filter by tags, itemType, color, season |
| `search` | string | Search in name and tags |

**Curl Commands:**

```bash
# Get all items
curl "http://localhost:3000/api/wardrobe"

# With pagination
curl "http://localhost:3000/api/wardrobe?page=1&limit=10"
```

**Response:**

```json
{
  "success": true,
  "items": [
    {
      "_id": "...",
      "name": "Blue Denim Jacket",
      "tags": ["jacket", "denim"],
      "itemType": "jacket",
      "color": "blue"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### POST /api/wardrobe

Add wardrobe items by uploading images. AI analyzes each image and extracts tags automatically.

**Parameters (multipart/form-data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | files | Yes | One or more clothing images (max 10) |

**Curl Command:**

```bash
curl -X POST "http://localhost:3000/api/wardrobe" \
  -F "images=@/path/to/shirt1.jpg" \
  -F "images=@/path/to/shirt2.jpg"
```

**Response:**

```json
{
  "success": true,
  "items": [...],
  "count": 2,
  "message": "Successfully added 2 item(s)"
}
```

#### GET /api/wardrobe/:id

Get a single wardrobe item.

```bash
curl "http://localhost:3000/api/wardrobe/ITEM_ID"
```

#### PUT /api/wardrobe/:id

Update a wardrobe item.

```bash
curl -X PUT "http://localhost:3000/api/wardrobe/ITEM_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "tags": ["new", "tags"]}'
```

#### DELETE /api/wardrobe/:id

Delete a wardrobe item.

```bash
curl -X DELETE "http://localhost:3000/api/wardrobe/ITEM_ID"
```

#### DELETE /api/wardrobe/clear

Clear all wardrobe items (for testing).

```bash
curl -X DELETE "http://localhost:3000/api/wardrobe/clear"
```

#### GET /api/wardrobe/stats

Get wardrobe statistics.

```bash
curl "http://localhost:3000/api/wardrobe/stats"
```

**Response:**

```json
{
  "success": true,
  "stats": {
    "totalItems": 15,
    "totalImages": 15
  }
}
```

---

## Usage Examples

### Chat with AI

```javascript
const response = await fetch('http://localhost:3000/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'What should I wear to a summer wedding?' })
});
const data = await response.json();
console.log(data.message);
```

### Virtual Try-On

```javascript
const formData = new FormData();
formData.append('image', garmentFile);
formData.append('userPhoto', userPhotoFile);

const response = await fetch('http://localhost:3000/api/ai/try-on', {
  method: 'POST',
  body: formData
});
const { image } = await response.json();
// image is base64 data URL
```

### Add to Wardrobe

```javascript
const formData = new FormData();
formData.append('images', imageFile);

const response = await fetch('http://localhost:3000/api/wardrobe', {
  method: 'POST',
  body: formData
});
const { items } = await response.json();
```

---

## File Structure

```
Fashion AI/
├── code/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/         # Database, AI provider
│   │   │   ├── middleware/     # Auth
│   │   │   ├── models/         # User, WardrobeItem
│   │   │   ├── routes/         # AI, auth, profile, wardrobe
│   │   │   ├── services/       # geminiService, geminiTryOn
│   │   │   └── index.js
│   │   ├── package.json
│   │   └── .env.example
│   └── prototype/              # Web prototype UI
├── docs/
└── README.md
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | [Get from AI Studio](https://aistudio.google.com/apikey) |
| `DATABASE_URL` | No | MongoDB connection string (optional) |
| `PORT` | No | Server port (default: 3000) |
| `GEMINI_CHAT_MODEL` | No | Override chat model (default: gemini-1.5-flash) |
| `GEMINI_VISION_MODEL` | No | Override vision model (default: gemini-1.5-flash) |

---

## Testing

### Quick Start Workflow

1. Start the server: `npm run dev`
2. Health check: `curl http://localhost:3000/health`
3. Chat: `curl -X POST http://localhost:3000/api/ai/chat -H "Content-Type: application/json" -d '{"message":"Hello"}'`
4. Add wardrobe item: `curl -X POST http://localhost:3000/api/wardrobe -F "images=@shirt.jpg"`
5. Get recommendations: `curl -X POST http://localhost:3000/api/ai/recommendations -H "Content-Type: application/json" -d '{"wardrobeItems":[{"name":"Shirt","tags":["casual"]}],"occasion":"date night"}'`

### Try the Prototype

Open `code/prototype/index.html` in a browser and connect to `http://localhost:3000` for a visual UI.

---

## Notes

- The API uses Google's Gemini 1.5 Flash for chat/vision; try-on uses Gemini 2.5 Flash Image
- Rate limit: 100 requests per 15 minutes (try-on excluded)
- File upload limit: 10MB per file
- MongoDB is optional; without it, wardrobe items are not persisted

---

## License

ISC

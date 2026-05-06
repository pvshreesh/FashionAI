# 🎨 App Shell Guide

## 🚀 Quick Start

### Step 1: Start the Backend Server

Open a terminal and run:
```bash
cd code/backend
npm run dev
```

You should see:
```
🚀 Fashion App API server running on port 3000
✅ MongoDB Connected (or continuing without DB)
🔑 Gemini API: Configured ✓
```

### Step 2: Open the App Shell

Open `http://localhost:3000/app` in your browser.

## 🎯 What You Can Test

### 1. 💬 AI Chat Tab
- Ask the AI fashion assistant questions
- Try: "What should I wear to a wedding?"
- Try: "What colors suit me best?"
- Try: "How do I style a denim jacket?"

### 2. 👔 Wardrobe Tab
- Add clothing items to your wardrobe
- Upload images for AI auto-tagging
- View your wardrobe items

### 3. ✨ Recommendations Tab
- Select an occasion (date, work, party, etc.)
- Optionally select body shape
- Get AI-powered outfit recommendations
- Uses the authenticated wardrobe data from the backend

### 4. 🔍 Analyze Image Tab
- Upload a clothing image
- Get AI analysis:
  - Item type (tshirt, dress, etc.)
  - Color
  - Pattern
  - Style
  - Body shape compatibility

## 📸 Screenshots of Features

The prototype demonstrates:
- ✅ Real-time AI chat responses
- ✅ Image upload and analysis
- ✅ Outfit recommendations
- ✅ Wardrobe management
- ✅ Beautiful, modern UI

## 🔧 Troubleshooting

**Server not connecting?**
- Make sure backend is running: `cd code/backend && npm run dev`
- Check if port 3000 is available
- Look for errors in the terminal

**API errors?**
- Check that Gemini API key is in `.env` file
- Verify API key is valid (test with `node test-gemini.js`)

**CORS errors?**
- Backend has CORS enabled, should work
- Try refreshing the page

## 🎨 Prototype Features

- **Modern UI**: Gradient background, clean design
- **Tab Navigation**: Easy switching between features
- **Real-time Updates**: Live API responses
- **Error Handling**: Clear error messages
- **Loading States**: Visual feedback during API calls

## 📝 Notes

- This is a **web prototype** for testing the backend
- The final app will be a **mobile app** (React Native)
- Some features require authentication (wardrobe management)
- Images are temporarily stored as base64 (will use cloud storage in production)

## 🚀 Next Steps

After testing the prototype:
1. ✅ Backend is working
2. Next: Build the mobile app
3. Then: Set up database (MongoDB)
4. Finally: Deploy and launch!

---

**Enjoy testing the prototype!** 🎉

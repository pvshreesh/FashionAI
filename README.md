# AI Fashion Stylist App

An AI-powered mobile fashion app that rates and adapts fashion choices, helps users manage their digital wardrobe, and provides intelligent outfit recommendations based on their existing clothes.

## 📁 Project Structure

```
project/
├── code/           # All application code (frontend, backend, mobile apps)
├── docs/           # Documentation, README files, and project overview
│   └── TECHNICAL_DOCUMENTATION.txt  # Complete technical and feature documentation
└── README.md       # This file - project overview
```

## 🎯 Core Concept

Similar to Umax (face rating), uCal (calendar), and RizzMAX (dating assistant), this app focuses on **fashion rating and adaptation**. The app helps users:

- Build a digital wardrobe by uploading their existing clothes
- Get AI-powered fashion ratings and style analysis
- Receive personalized outfit recommendations from their own wardrobe
- Check if new clothes will fit before purchasing
- Chat with an AI fashion assistant for styling advice

## ✨ Key Features

1. **Digital Wardrobe** - Upload and organize all your clothes with tags and metadata
2. **AI Fashion Rating** - Get style scores and analysis for each item
3. **Fit Checker** - Check if new clothes will fit before buying
4. **AI Chat Assistant** - Conversational interface for fashion advice
5. **Outfit Recommendations** - Get styled with clothes you already own
6. **Body Shape Analysis** - Research-backed styling based on body shape (privacy-focused)

## 🚀 Quick Start

1. **Backend Setup**:
   ```bash
   cd code/backend
   npm install
   npm run dev
   ```
   See `code/backend/SETUP.md` for API key configuration

2. **Review Documentation**:
   - Complete specs: `docs/TECHNICAL_DOCUMENTATION.txt`
   - AI strategy: `docs/AI_IMPLEMENTATION_STRATEGY.md`
   - Development status: `DEVELOPMENT_STATUS.md`

3. **Test Backend**:
   ```bash
   cd code/backend
   node test-gemini.js
   ```

## 📱 Platform

- **Primary**: iOS and Android (mobile-first)
- **Technology**: Cross-platform (React Native or Flutter recommended)

## 🔒 Privacy & Design Philosophy

- Body measurements are **NEVER displayed in UI** (stored encrypted in backend only)
- Focus on empowerment and style, not body correction
- User privacy is paramount, especially for sensitive data

## 📚 Documentation

For complete details on:
- Features and functionality
- UI/UX design specifications
- Technical architecture
- Database schemas
- AI/ML integration
- Development roadmap

See: `docs/TECHNICAL_DOCUMENTATION.txt`

## 🔄 Update Process

**Important**: Every time we update ideas or implement features, the technical documentation (`docs/TECHNICAL_DOCUMENTATION.txt`) must be updated to reflect changes.

---

*Last Updated: January 24, 2026*

# Fashion App - Code Directory

## Project Structure

```
code/
├── backend/          # Backend API server
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic (AI, recommendations)
│   │   ├── models/      # Database models
│   │   ├── utils/        # Helper functions
│   │   └── config/       # Configuration
│   ├── package.json
│   └── .env
├── app/             # Production-style frontend shell
│   ├── index.html
│   ├── app.js
│   ├── api.js
│   └── styles.css
├── mobile/          # Mobile app (React Native or Flutter)
│   └── (to be added)
└── .env             # Environment variables (DO NOT COMMIT)
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp ../.env.example ../.env
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### Frontend Shell

Open `app/index.html` through a local static server and point it at the backend with `fashion-api-base` in `localStorage` if needed.

When the backend is running, the same shell is served directly at `http://localhost:3000/app`.

The production UI lives in `app/` and is also served from `http://localhost:3000/app` by the backend.

## API Key Security

⚠️ **IMPORTANT**: Never commit `.env` file or API keys to git!
- The `.env` file is already in `.gitignore`
- Use `.env.example` as a template
- Keep API keys secret and rotate them regularly

## Development Status

- [x] Project structure setup
- [x] Environment configuration
- [ ] Backend API server
- [ ] Gemini API integration
- [ ] Mobile app setup
- [ ] Database setup

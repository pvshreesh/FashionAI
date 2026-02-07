# Database – store clothes properly

## Goal

Store wardrobe items in the database so users don’t have to re-upload every time. Upload once → save → reuse across sessions and features.

## Setup (do this once)

**Full step-by-step:** [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

- **Option A – MongoDB Atlas (recommended):** Free cloud DB. Create cluster → user → get connection string → put in `.env` as `DATABASE_URL`.
- **Option B – Local MongoDB:** Install MongoDB, set `DATABASE_URL=mongodb://localhost:27017/fashion-app` in `.env`.

Then restart the backend. You should see: `✅ MongoDB Connected`.

## Verify

```bash
cd code/backend
node test-database.js
```

Or open http://localhost:3000/health — `database` should be `"connected"`.

## What’s already done

- **Models:** `User`, `WardrobeItem`, `Outfit` in `code/backend/src/models/`.
- **Routes:** Wardrobe CRUD and stats work when DB is connected; they return empty/friendly responses when DB is disconnected.
- **Upload flow:** On successful connect, `WardrobeItem.save()` persists; GET `/api/wardrobe` returns saved items.

## Optional later

- Associate items with real users (JWT).
- Pagination, filters, search.
- Image storage: cloud (e.g. Cloudinary/S3) instead of base64.

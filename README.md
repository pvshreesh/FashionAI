# Fashion AI

Fashion AI is a small multimodal styling app that analyzes clothing photos, saves a wardrobe, recommends outfits, answers styling questions, and provides virtual try-on.

## Stack

- Browser app: vanilla HTML, CSS, and JavaScript in `code/app`
- API: Node.js and Express in `code/backend`
- AI: Google Gemini; optional Cloudflare Workers AI for text-to-image
- AWS: Cognito, DynamoDB, S3, App Runner, Amplify, and CDK

## Run locally

Requirements: Node.js 20+, AWS credentials, a Cognito user pool/client, DynamoDB tables, and a Gemini API key.

```bash
cd code/backend
npm install
npm run setup
```

Edit `code/backend/.env`. The required values are documented in `code/backend/.env.example`. For a private wardrobe, use `WARDROBE_MODE=per-user`; `shared` is intended only for local demos.

```bash
npm run dev
```

Open `http://localhost:3000/app`. The `/health` response reports which optional features are configured, and the UI disables unavailable features.

## Main flow

1. Register and confirm an account, then sign in.
2. Analyze a JPEG, PNG, or WebP clothing photo.
3. Save the structured result to the wardrobe.
4. Search or delete saved items and request recommendations for an occasion.
5. Optionally upload a profile photo for virtual try-on.

## API

- Health: `GET /`, `GET /health`
- Auth: `POST /api/auth/register`, `/confirm`, `/login`, `/refresh`; `GET /api/auth/me`
- Profile: `GET /api/profile`; `POST` or `DELETE /api/profile/photo`
- AI: `POST /api/ai/chat`, `/analyze-image`, `/recommendations`, `/rate-item`, `/try-on`, `/generate-image`
- Wardrobe: `GET` or `POST /api/wardrobe`; `POST /api/wardrobe/save-analyzed`; `GET`, `PUT`, or `DELETE /api/wardrobe/:id`

## Validate

```bash
cd code/backend
npm test
npm audit

cd ../../infra
npm install
npm run build
npm audit
```

## Deploy

The CDK stack creates isolated `dev`, `staging`, and `prod` resources. Production uses authenticated per-user wardrobes and S3 image storage. See [AWS architecture](docs/AWS_ARCHITECTURE.md) and [deployment checklist](docs/AWS_SETUP_CHECKLIST.md).

FROM node:20-alpine AS base

WORKDIR /app

COPY code/backend/package*.json ./
RUN npm ci --omit=dev

COPY code/backend/src ./src
COPY code/backend/.env.example ./
COPY code/backend/setup-env.js ./
COPY code/app ./app

EXPOSE 3000

CMD ["node", "src/index.js"]

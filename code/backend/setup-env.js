#!/usr/bin/env node
// Create .env from template if it doesn't exist
// Your real credentials stay in .env (gitignored) and are never committed

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const examplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(examplePath)) {
  console.error('Error: .env.example not found');
  process.exit(1);
}

if (fs.existsSync(envPath)) {
  console.log('.env already exists - your credentials are in place');
  process.exit(0);
}

fs.copyFileSync(examplePath, envPath);
console.log('Created .env from template.');
console.log('Edit code/backend/.env and add your real values (DATABASE_URL, etc.)');
console.log('Never commit .env - it is gitignored.');

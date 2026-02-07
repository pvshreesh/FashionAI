# How to Start the Backend Server

## Quick Start

1. **Open a terminal/command prompt**

2. **Navigate to backend folder**:
   ```bash
   cd c:\project\code\backend
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

4. **You should see**:
   ```
   🚀 Fashion App API server running on port 3000
   📝 Environment: development
   🔑 Gemini API: Configured ✓
   ```

5. **Test the server**:
   - Open browser: `http://localhost:3000/health`
   - Should show: `{"status":"ok","message":"Fashion App API is running"}`

## Troubleshooting

### Port 3000 already in use?
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in .env file
PORT=3001
```

### Server won't start?
1. Check if Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check `.env` file exists with `GEMINI_API_KEY`
4. Check for errors in terminal output

### MongoDB connection errors?
- Server will continue without MongoDB (some features disabled)
- For full functionality, set up MongoDB or MongoDB Atlas
- Add `DATABASE_URL` to `.env` file

## Running in Background (Windows)

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\project\code\backend; npm run dev"
```

## Verify Server is Running

```bash
# Test health endpoint
curl http://localhost:3000/health

# Or in browser
http://localhost:3000/health
```

---

**Server should be running on `http://localhost:3000`** 🚀

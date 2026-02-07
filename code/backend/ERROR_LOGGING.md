# Error Logging System

## Overview

Detailed error logging has been added to track failed image uploads and processing errors.

## How It Works

When images fail to process, detailed error information is saved to log files in:
```
code/backend/logs/wardrobe-errors-YYYY-MM-DD.txt
```

## What Gets Logged

For each failed image:
- **Image Info:**
  - Index number
  - Filename
  - File size
  - MIME type
  - Timestamp

- **Error Details:**
  - Error message
  - Error type (AI Analysis Failed, No Tags Extracted, Processing Error)
  - Raw AI response (if available)
  - Stack trace (for processing errors)

## Log File Format

```
=== Wardrobe Upload Errors - 2026-01-26T03:30:00.000Z ===

Total Files: 6
Successful: 4
Failed: 2

=== Error Details ===

{
  "index": 3,
  "filename": "image3.jpg",
  "size": 245678,
  "mimetype": "image/jpeg",
  "timestamp": "2026-01-26T03:30:00.000Z",
  "error": "AI analysis timeout",
  "errorType": "AI Analysis Failed",
  "rawResponse": null
}
```

## API Response

The API now returns detailed error information:

```json
{
  "success": true,
  "items": [...],
  "count": 4,
  "errors": [
    {
      "image": 3,
      "filename": "image3.jpg",
      "error": "AI analysis timeout"
    }
  ],
  "errorSummary": {
    "total": 6,
    "successful": 4,
    "failed": 2,
    "failedImages": [...]
  },
  "errorLogFile": "logs/wardrobe-errors-2026-01-26.txt"
}
```

## Checking Logs

1. **View latest log:**
   ```bash
   cd code/backend/logs
   Get-Content wardrobe-errors-*.txt | Select-Object -Last 50
   ```

2. **Find specific error:**
   ```bash
   Get-Content wardrobe-errors-*.txt | Select-String "image3.jpg"
   ```

## Next Steps

- ✅ Error logging implemented
- ✅ Detailed error information in API response
- ✅ Log files saved automatically
- 🔄 Check if successful items are retrievable (next)

---

**Error logs help debug issues with image processing!** 📝

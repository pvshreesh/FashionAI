# Troubleshooting Guide

## Common Issues

### "Failed to add wardrobe item"

**Possible causes:**
1. **MongoDB not connected** - Server continues without DB, but items won't save
2. **AI analysis failed** - Check Gemini API key and connection
3. **Image too large** - Max 10MB per image
4. **Invalid image format** - Only image files accepted

**Solutions:**
1. Check server logs for detailed error
2. Verify Gemini API key in `.env` file
3. Try smaller image files
4. Check browser console for errors

### Server won't start

**Error: `authenticate is not defined`**
- Fixed: Removed authenticate requirement for MVP
- Restart server: `npm run dev`

### Images not uploading

**Check:**
- Image file size < 10MB
- Valid image format (jpg, png, etc.)
- Server is running
- Check browser console for CORS errors

### AI not responding

**Check:**
- Gemini API key in `.env` file
- API key is valid (test with `node test-gemini.js`)
- Internet connection
- Server logs for API errors

---

**For detailed errors, check server terminal output!**

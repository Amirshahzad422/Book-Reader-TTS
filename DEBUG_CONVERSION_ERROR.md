# Debugging Conversion Error

## Steps to Debug

### 1. Check Browser Console
Open DevTools (F12) → Console tab and look for:
- `❌ Error converting to audio:` - Shows the actual error
- `API Response Status:` - Shows HTTP status code
- `API Error Response:` - Shows detailed error from server

### 2. Check Server Console
In your terminal where `npm run dev` is running, look for:
- `❌ Error converting PDF to audio:` - Server-side error
- `Error name:` - Error type
- `Error message:` - Actual error message
- `Error stack:` - Full stack trace

### 3. Common Issues

#### Issue: "No PDF file or text provided"
**Cause:** Neither PDF nor text was sent to API
**Fix:** Make sure you've uploaded a PDF or entered text

#### Issue: "Text input is empty"
**Cause:** Text input is empty or only whitespace
**Fix:** Enter at least 10 characters of text

#### Issue: "Could not extract readable text from PDF"
**Cause:** PDF is image-based or corrupted
**Fix:** Use a PDF with selectable text

#### Issue: "OpenAI API key not configured"
**Cause:** Missing OPENAI_API_KEY in .env.local
**Fix:** Add `OPENAI_API_KEY=your-key-here` to `.env.local` and restart server

#### Issue: "All OpenAI API keys have exceeded their quota"
**Cause:** API quota exceeded
**Fix:** Add billing to OpenAI account or wait for quota reset

### 4. Test with Text Input First
Try converting a simple text input (10+ characters) to isolate if the issue is:
- PDF extraction (if text works but PDF doesn't)
- API call (if both fail)
- Text processing (if specific text fails)

### 5. Check Network Tab
1. Open DevTools (F12) → Network tab
2. Try converting again
3. Click on the `/api/convert-to-audio` request
4. Check:
   - **Status:** Should be 200 for success, 400/500 for errors
   - **Response:** Click "Response" tab to see error message
   - **Headers:** Check request/response headers

### 6. Verify Environment Variables
```bash
# Check if API key is set
grep OPENAI_API_KEY .env.local
```

### 7. Test API Directly
```bash
# Test with curl (replace with your actual text)
curl -X POST http://localhost:3000/api/convert-to-audio \
  -F "text=This is a test message for audio conversion" \
  -F "voice=fable" \
  -F "speed=1.0"
```

## Next Steps
After checking the above, share:
1. Browser console error message
2. Server console error message
3. Network tab response
4. Whether text input or PDF input fails


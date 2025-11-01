# Long PDF Chunking Implementation Plan

## Current Issue
- **Current Limit**: Only first ~4000 characters are converted
- **Rest is discarded**: Remaining text is truncated
- **OpenAI Limit**: 4096 characters per TTS request

## Solution: Implement Chunking

### Approach
1. Split long PDF text into chunks of ~3800 characters each
2. Generate audio for each chunk sequentially
3. Concatenate all audio chunks into a single MP3 file
4. Return complete audio file

### Benefits
- ✅ Complete PDF conversion (no truncation)
- ✅ Handles PDFs of any length
- ✅ Single audio file output
- ✅ Maintains voice consistency across chunks

### Implementation Strategy

**Option 1: Sequential Processing (Recommended)**
- Generate chunks one by one
- Concatenate audio files on server
- Simpler, more reliable
- Takes longer for very large PDFs

**Option 2: Parallel Processing**
- Generate multiple chunks simultaneously
- Faster but more complex
- Higher API costs if rate limits hit

### Technical Details

1. **Chunking Logic**: Use existing `splitTextIntoChunks` function
2. **Audio Concatenation**: Use FFmpeg or similar library
3. **Progress Tracking**: Show progress for each chunk
4. **Error Handling**: If one chunk fails, handle gracefully

### Estimated Costs
- **Small PDF** (4000 chars): 1 API call = ~$0.25
- **Medium PDF** (10,000 chars): 3 API calls = ~$0.75
- **Large PDF** (50,000 chars): 13 API calls = ~$3.25


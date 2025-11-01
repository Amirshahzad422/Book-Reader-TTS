# Storage Implementation Plan: PDF & Audio Files in Supabase

## 📋 Overview

This document outlines the complete plan for storing user-uploaded PDF files and generated audio files in Supabase Storage, along with metadata tracking in the database.

---

## 🗂️ 1. Storage Buckets Structure

### Bucket Organization

```
Supabase Storage
├── pdfs/                    # User-uploaded PDF files
│   └── {user_id}/
│       └── {conversion_id}/
│           └── document.pdf
│
└── audio/                   # Generated audio files
    └── {user_id}/
        └── {conversion_id}/
            └── output.mp3
```

### Bucket Configuration

**Bucket: `pdfs`**
- **Public**: ❌ No (Private - authenticated users only)
- **File Size Limit**: 30 MB (matches current frontend limit)
- **Allowed MIME Types**: `application/pdf`
- **Lifecycle**: Keep indefinitely (or implement retention policy)

**Bucket: `audio`**
- **Public**: ⚠️ Optional (Private by default, can make public for direct CDN access)
- **File Size Limit**: 50 MB (audio files are typically smaller)
- **Allowed MIME Types**: `audio/mpeg`, `audio/mp3`
- **Lifecycle**: Keep indefinitely (users may want to replay)

### Recommended Folder Structure Pattern

```
{user_id}/{conversion_id}/{filename}
```

**Example:**
```
pdfs/
  └── f8b48a13-c54e-465f-b37f-40ef873b3a47/
      └── abc123-def456-ghi789/
          └── research-paper.pdf

audio/
  └── f8b48a13-c54e-465f-b37f-40ef873b3a47/
      └── abc123-def456-ghi789/
          └── output.mp3
```

**Benefits:**
- Easy to find all files for a user
- Easy to delete all files for a conversion
- Clean organization
- Supports future folder-based cleanup policies

---

## 💾 2. Database Schema

### New Table: `conversions`

```sql
CREATE TABLE conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- File paths in storage
  pdf_path TEXT NOT NULL,           -- e.g., "f8b48a13-.../abc123-.../document.pdf"
  audio_path TEXT,                  -- NULL until conversion completes
  
  -- File metadata
  pdf_filename TEXT NOT NULL,
  pdf_size BIGINT NOT NULL,          -- Size in bytes
  audio_size BIGINT,                 -- Size in bytes (NULL until generated)
  
  -- Conversion settings (stored for reference/replay)
  voice TEXT NOT NULL,               -- e.g., "onyx", "nova"
  voice_settings JSONB,              -- Full voice settings object
  detected_language TEXT,            -- e.g., "arabic", "hindi", "latin"
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,                -- If status = 'failed'
  
  -- Processing metadata
  text_length INTEGER,               -- Extracted text character count
  audio_duration REAL,               -- Audio duration in seconds (if available)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT conversions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_conversions_user_id ON conversions(user_id);
CREATE INDEX idx_conversions_status ON conversions(status);
CREATE INDEX idx_conversions_created_at ON conversions(created_at DESC);
CREATE INDEX idx_conversions_user_status ON conversions(user_id, status);
```

### Example `voice_settings` JSONB Structure

```json
{
  "speed": 1.0,
  "emotionalRange": "Natural",
  "tone": "Natural",
  "intonation": "Natural",
  "accent": "American",
  "age": "Adult",
  "customInstructions": "Speak with enthusiasm..."
}
```

---

## 🔐 3. Row Level Security (RLS) Policies

### Conversions Table Policies

```sql
-- Enable RLS
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversions
CREATE POLICY "Users can view own conversions" ON conversions
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can insert their own conversions
CREATE POLICY "Users can insert own conversions" ON conversions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own conversions (for status updates)
CREATE POLICY "Users can update own conversions" ON conversions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own conversions (cleanup)
CREATE POLICY "Users can delete own conversions" ON conversions
  FOR DELETE USING (auth.uid()::text = user_id::text);
```

### Storage Bucket Policies

**For `pdfs` bucket:**
```sql
-- Allow authenticated users to upload their own PDFs
CREATE POLICY "Users can upload own PDFs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pdfs' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to read their own PDFs
CREATE POLICY "Users can read own PDFs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pdfs' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own PDFs
CREATE POLICY "Users can delete own PDFs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pdfs' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**For `audio` bucket:**
```sql
-- Service role can upload audio (server-side only)
CREATE POLICY "Service role can upload audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio' AND
    auth.role() = 'service_role'
  );

-- Users can read their own audio files
CREATE POLICY "Users can read own audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own audio files
CREATE POLICY "Users can delete own audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## ⚡ 4. Optimization Strategies

### 4.1 File Size Limits

- **PDFs**: 30 MB (already enforced in frontend)
- **Audio**: ~50 MB max (estimate for long documents)
  - For longer documents, consider chunking or compression

### 4.2 Compression (Future Enhancement)

**Audio Compression:**
- Currently using OpenAI TTS which outputs MP3
- Could add post-processing compression if needed (rarely necessary)

**PDF Compression:**
- Most PDFs are already compressed
- Consider server-side compression for very large PDFs if needed

### 4.3 CDN & Caching

**Option 1: Private Storage (Current Plan)**
- Files accessed via signed URLs (expiring links)
- Generated on-demand via API route
- More secure, but requires server round-trip

**Option 2: Public Audio Bucket (Future)**
- Make `audio` bucket public
- Direct CDN access via Supabase CDN
- Faster playback, but less security
- Can be combined with signed URLs for control

### 4.4 Cleanup & Retention Policies

**Manual Cleanup (Recommended Initially):**
- Allow users to delete conversions (cascades to storage)
- Provide admin cleanup script for orphaned files

**Automatic Cleanup (Future):**
```sql
-- Example: Delete conversions older than 90 days
DELETE FROM conversions
WHERE created_at < NOW() - INTERVAL '90 days'
AND status = 'completed';
```

**Storage Cleanup Script:**
- Periodically check for orphaned files (not linked in DB)
- Delete files older than X days from failed conversions

---

## 🔄 5. Implementation Flow

### 5.1 PDF Upload Flow

```
1. User uploads PDF via frontend
   ↓
2. Frontend sends to /api/convert-to-audio
   ↓
3. API route:
   a. Generate conversion_id (UUID)
   b. Upload PDF to storage: pdfs/{user_id}/{conversion_id}/{filename}
   c. Create conversion record in DB (status: 'pending')
   d. Return conversion_id to frontend
   ↓
4. Frontend polls/watches for conversion status
```

### 5.2 Audio Generation Flow

```
1. API route receives conversion request
   ↓
2. Retrieve PDF from storage using pdf_path
   ↓
3. Extract text from PDF
   ↓
4. Generate audio via OpenAI TTS
   ↓
5. Upload audio to storage: audio/{user_id}/{conversion_id}/output.mp3
   ↓
6. Update conversion record:
   - status: 'completed'
   - audio_path: path to audio file
   - audio_size: file size
   - audio_duration: duration (if available)
   - completed_at: NOW()
   ↓
7. Return signed URL for audio playback
```

### 5.3 Audio Playback Flow

```
1. User requests audio playback
   ↓
2. Frontend calls /api/conversions/{id}/audio-url
   ↓
3. API route:
   a. Verify user owns the conversion (RLS)
   b. Generate signed URL for audio_path (expires in 1 hour)
   c. Return signed URL
   ↓
4. Frontend plays audio via signed URL
```

---

## 📝 6. API Endpoints

### 6.1 New Endpoints

**POST `/api/conversions/start`**
- Upload PDF to storage
- Create conversion record
- Start background processing (or process immediately)
- Returns: `{ conversion_id, status, pdf_url }`

**GET `/api/conversions`**
- List user's conversions (paginated)
- Returns: `{ conversions: [...], total, page, limit }`

**GET `/api/conversions/{id}`**
- Get conversion details
- Returns: Full conversion object with signed URLs

**GET `/api/conversions/{id}/audio-url`**
- Get signed URL for audio playback
- Returns: `{ audio_url, expires_at }`

**DELETE `/api/conversions/{id}`**
- Delete conversion and associated files
- Returns: `{ success: true }`

**GET `/api/conversions/{id}/status`**
- Poll conversion status (for real-time updates)
- Returns: `{ status, progress?, error? }`

### 6.2 Modified Endpoints

**POST `/api/convert-to-audio`** (Refactor)
- Instead of receiving File directly, receive `conversion_id`
- Or: Keep current flow but add storage after generation
- Generate audio, upload to storage, update conversion record

---

## 🎯 7. Migration Strategy

### Phase 1: Setup Infrastructure
1. ✅ Create storage buckets (`pdfs`, `audio`)
2. ✅ Create `conversions` table
3. ✅ Set up RLS policies
4. ✅ Create helper functions for storage operations

### Phase 2: Upload Storage
1. Modify `/api/convert-to-audio` to:
   - Upload PDF to storage first
   - Create conversion record
   - Process asynchronously
2. Update frontend to handle conversion_id

### Phase 3: Audio Storage
1. Upload generated audio to storage
2. Update conversion record with audio_path
3. Return signed URL instead of streaming

### Phase 4: UI Enhancements
1. Add "My Conversions" page
2. Show conversion history
3. Add delete/replay functionality
4. Add download buttons for PDF/audio

---

## 🔒 8. Security Considerations

1. **Authentication Required**: All operations require authenticated user
2. **User Isolation**: Users can only access their own files (RLS)
3. **Signed URLs**: Audio URLs expire after 1 hour
4. **File Validation**: Verify PDF MIME type and size before upload
5. **Rate Limiting**: Prevent abuse (future enhancement)
6. **Virus Scanning**: Consider for production (future enhancement)

---

## 📊 9. Cost Optimization

### Storage Costs (Supabase Free Tier)
- **Free Tier**: 1 GB storage, 2 GB bandwidth/month
- **Paid Tier**: $0.021/GB/month storage

### Optimization Tips
1. **Delete old conversions**: Implement retention policy
2. **Compress audio**: Use efficient encoding (already MP3)
3. **Lazy loading**: Only generate signed URLs when requested
4. **CDN**: Use Supabase CDN for public audio (future)

---

## 🧪 10. Testing Plan

1. **Unit Tests**:
   - Storage upload/download functions
   - Database queries
   - Signed URL generation

2. **Integration Tests**:
   - Full conversion flow
   - File cleanup on deletion
   - RLS policy enforcement

3. **Load Tests**:
   - Concurrent uploads
   - Large file handling
   - Multiple conversions per user

---

## 📅 11. Implementation Checklist

### Backend
- [ ] Create storage buckets in Supabase
- [ ] Create `conversions` table
- [ ] Set up RLS policies
- [ ] Create storage helper functions
- [ ] Modify `/api/convert-to-audio` to use storage
- [ ] Create `/api/conversions` endpoints
- [ ] Add signed URL generation
- [ ] Implement file cleanup on delete

### Frontend
- [ ] Update conversion flow to handle conversion_id
- [ ] Add conversion status polling
- [ ] Create "My Conversions" page
- [ ] Add download buttons
- [ ] Show conversion history
- [ ] Add delete functionality

### Testing
- [ ] Test PDF upload to storage
- [ ] Test audio generation and storage
- [ ] Test signed URL generation
- [ ] Test RLS policies
- [ ] Test file cleanup
- [ ] Test error handling

---

## 🚀 Next Steps

1. **Review this plan** and make adjustments
2. **Create SQL migration** for database schema
3. **Set up storage buckets** in Supabase dashboard
4. **Implement Phase 1** (infrastructure setup)
5. **Implement Phase 2** (PDF upload storage)
6. **Implement Phase 3** (Audio storage)
7. **Implement Phase 4** (UI enhancements)

---

## 💡 Future Enhancements

1. **Batch Conversions**: Upload multiple PDFs at once
2. **Conversion Queue**: Process conversions in background queue
3. **Progress Tracking**: Real-time progress updates
4. **Audio Editing**: Trim/edit generated audio
5. **Export Options**: Export to different formats (WAV, OGG)
6. **Sharing**: Share conversions with other users (with permissions)
7. **Analytics**: Track usage, popular voices, etc.
8. **Webhooks**: Notify users when conversion completes

---

**Last Updated**: 2025-01-XX
**Status**: Planning Phase


# Storage Setup Guide

## 📦 Prerequisites

1. Supabase project with database set up
2. Run the database migration: `supabase-conversions-schema.sql`

## 🗂️ Step 1: Create Storage Buckets

### 1.1 Navigate to Storage

1. Go to your Supabase project dashboard
2. Click on **Storage** in the left sidebar
3. Click **New bucket**

### 1.2 Create `pdfs` Bucket

**Bucket Settings:**
- **Name**: `pdfs`
- **Public bucket**: ❌ **No** (unchecked - private)
- **Allowed MIME types**: `application/pdf` (optional, for extra security)
- **File size limit**: 31457280 (30 MB in bytes)

Click **Create bucket**

### 1.3 Create `audio` Bucket

**Bucket Settings:**
- **Name**: `audio`
- **Public bucket**: ❌ **No** (unchecked - private)
- **Allowed MIME types**: `audio/mpeg` (optional, for extra security)
- **File size limit**: 52428800 (50 MB in bytes)

Click **Create bucket**

## 🔐 Step 2: Set Up Storage Policies

### 2.1 Navigate to SQL Editor

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**

### 2.2 Run Storage Policies SQL

Copy and paste the following SQL:

```sql
-- Storage Policies for PDFs bucket
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

-- Storage Policies for Audio bucket
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

3. Click **Run** to execute the SQL

## ✅ Step 3: Verify Setup

### 3.1 Check Buckets

1. Go to **Storage** → You should see both `pdfs` and `audio` buckets
2. Both should show as **Private** (not public)

### 3.2 Check Policies

1. Go to **Storage** → Click on `pdfs` bucket
2. Click **Policies** tab
3. You should see 3 policies:
   - Users can upload own PDFs
   - Users can read own PDFs
   - Users can delete own PDFs

4. Repeat for `audio` bucket - should have 3 policies:
   - Service role can upload audio
   - Users can read own audio
   - Users can delete own audio

### 3.3 Test the Application

1. Start your development server: `npm run dev`
2. Log in to your application
3. Upload a PDF and convert it to audio
4. Click **Save Conversation** button
5. Check **View Past Conversations** to see saved files

## 🔧 Troubleshooting

### Error: "Bucket not found"
- Make sure you created both `pdfs` and `audio` buckets
- Check bucket names are exactly `pdfs` and `audio` (lowercase)

### Error: "Policy violation" or "Unauthorized"
- Verify storage policies are set up correctly
- Check that the user is authenticated
- Ensure `SUPABASE_SERVICE_ROLE` key is set in `.env.local`

### Error: "File upload failed"
- Check file size limits (30MB for PDFs, 50MB for audio)
- Verify bucket exists and policies are active
- Check browser console for detailed error messages

### Files not showing in "Past Conversations"
- Check that `conversions` table exists (run `supabase-conversions-schema.sql`)
- Verify RLS policies on `conversions` table are set up
- Check browser console for API errors

## 📝 Environment Variables

Make sure you have these set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

## 🎉 Success!

Once setup is complete, users can:
- ✅ Save PDFs and audio files to their account
- ✅ View past conversions
- ✅ Download saved files
- ✅ Delete old conversions
- ✅ Access files securely (private storage)

---

**Next Steps:**
- Consider implementing cleanup policies for old files
- Monitor storage usage
- Set up alerts for storage quota limits (if using paid plan)


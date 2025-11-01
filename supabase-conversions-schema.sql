-- Create conversions table
CREATE TABLE IF NOT EXISTS conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
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
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'conversions_user_id_fkey'
  ) THEN
    ALTER TABLE conversions 
    ADD CONSTRAINT conversions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_user_status ON conversions(user_id, status);

-- Enable RLS
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own conversions" ON conversions;
CREATE POLICY "Users can view own conversions" ON conversions
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own conversions" ON conversions;
CREATE POLICY "Users can insert own conversions" ON conversions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own conversions" ON conversions;
CREATE POLICY "Users can update own conversions" ON conversions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own conversions" ON conversions;
CREATE POLICY "Users can delete own conversions" ON conversions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_conversions_updated_at ON conversions;
CREATE TRIGGER update_conversions_updated_at BEFORE UPDATE ON conversions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


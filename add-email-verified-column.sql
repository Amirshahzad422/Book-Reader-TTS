-- Add email_verified column to users table
-- Run this in Supabase SQL Editor

-- Add email_verified column (defaults to false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update existing users to have email_verified = false
UPDATE users SET email_verified = false WHERE email_verified IS NULL;

-- Create index on email_verified for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'email_verified';


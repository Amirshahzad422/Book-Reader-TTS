-- Complete fix for NextAuth with Supabase
-- Run this in Supabase SQL Editor

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Allow all operations" ON users;

-- Step 2: Disable RLS completely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- That's it! Now the users table has no access restrictions
-- You can insert, select, update, delete without any policies blocking

-- Verify by running:
-- SELECT * FROM users;


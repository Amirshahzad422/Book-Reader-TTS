-- Fix RLS policies for NextAuth
-- Run this in Supabase SQL Editor

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Disable RLS temporarily to allow inserts
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with new policy that works with NextAuth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all operations (for development)
-- We can make this more secure later
CREATE POLICY "Allow all operations" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

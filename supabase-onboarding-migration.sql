-- Migration: Add onboarding fields to user_profiles table
-- Run this in your Supabase SQL editor

-- Add username column if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Add onboarding_completed column if it doesn't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create unique index on username (allows NULL but ensures uniqueness for non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;

-- Update existing users to mark onboarding as incomplete
UPDATE user_profiles SET onboarding_completed = FALSE WHERE onboarding_completed IS NULL;


-- Migration: Fix RLS policies to support anonymous users
-- Updates policies to allow anonymous users to create and manage AI configurations
-- where user_id is NULL

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own AI configs" ON ai_configurations;
DROP POLICY IF EXISTS "Users can insert their own AI configs" ON ai_configurations;
DROP POLICY IF EXISTS "Users can update their own AI configs" ON ai_configurations;
DROP POLICY IF EXISTS "Users can delete their own AI configs" ON ai_configurations;

-- Create new policies that support both authenticated and anonymous users

-- SELECT policy: Users can view their own configs OR anonymous configs
CREATE POLICY "Users can view their own AI configs"
  ON ai_configurations
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- INSERT policy: Users can insert configs with their user_id OR NULL for anonymous
CREATE POLICY "Users can insert their own AI configs"
  ON ai_configurations
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- UPDATE policy: Users can update their own configs OR anonymous configs
CREATE POLICY "Users can update their own AI configs"
  ON ai_configurations
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- DELETE policy: Users can delete their own configs OR anonymous configs
CREATE POLICY "Users can delete their own AI configs"
  ON ai_configurations
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Add comment
COMMENT ON TABLE ai_configurations IS 'Stores AI configurations for both authenticated users (user_id set) and anonymous users (user_id NULL)';

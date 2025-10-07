-- Migration: Add default AI configuration tracking
-- Adds a column to track which AI config is the user's default

-- Add default_ai_config_id column to auth.users via a separate table
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_ai_config_id UUID REFERENCES ai_configurations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE user_preferences IS 'Stores user preferences including default AI configuration';
COMMENT ON COLUMN user_preferences.default_ai_config_id IS 'The default AI configuration to use for games';

-- Migration: AI Configurations and Multi-Player Support
-- Adds support for storing multiple AI configurations and AI vs AI games

-- Create ai_configurations table
CREATE TABLE ai_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for anonymous users
  name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai',
  key_encrypted JSONB NOT NULL, -- Stores {iv, content, tag} for AES-256-GCM
  base_url TEXT, -- Optional custom API endpoint
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_ai_configurations_user_id ON ai_configurations(user_id);

-- Enable RLS
ALTER TABLE ai_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_configurations
CREATE POLICY "Users can view their own AI configs"
  ON ai_configurations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI configs"
  ON ai_configurations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI configs"
  ON ai_configurations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI configs"
  ON ai_configurations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update games table for multi-player support
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'human_vs_ai';
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_1_id UUID REFERENCES ai_configurations(id) ON DELETE SET NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_2_id UUID; -- Can reference either ai_configurations or auth.users
ALTER TABLE games ADD COLUMN IF NOT EXISTS player_2_type TEXT DEFAULT 'human'; -- 'human' or 'ai'

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_games_player_1_id ON games(player_1_id);
CREATE INDEX IF NOT EXISTS idx_games_player_2_id ON games(player_2_id);
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);

-- Add comments
COMMENT ON COLUMN ai_configurations.key_encrypted IS 'AES-256-GCM encrypted API key stored as {iv, content, tag}';
COMMENT ON COLUMN games.game_type IS 'Type of game: human_vs_ai or ai_vs_ai';
COMMENT ON COLUMN games.player_1_id IS 'AI configuration ID for player 1 (always AI)';
COMMENT ON COLUMN games.player_2_id IS 'Either user_id (if player_2_type=human) or ai_configuration_id (if player_2_type=ai)';
COMMENT ON COLUMN games.player_2_type IS 'Type of player 2: human or ai';

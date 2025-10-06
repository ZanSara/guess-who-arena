-- Complete initial schema for Guess Who Arena
-- Includes all tables, indexes, and RLS policies

-- Custom prompts table
CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  prompt_text TEXT NOT NULL,
  model_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table (with user_id nullable for anonymous games)
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for anonymous games
  user_character VARCHAR(50) NOT NULL,
  llm_character VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  winner VARCHAR(10), -- 'user', 'llm', or NULL if incomplete
  conversation JSONB NOT NULL, -- Stores full chat history
  user_eliminated JSONB, -- Array of eliminated character names
  llm_eliminated JSONB, -- Array of eliminated character names
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- API Keys table (encrypted storage)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL, -- Should be encrypted at application level
  base_url TEXT, -- Custom API endpoint URL (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_id ON custom_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Custom prompts policies
CREATE POLICY "Users can view their own prompts" ON custom_prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts" ON custom_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts" ON custom_prompts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts" ON custom_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Games policies
-- Allow public read access for game sharing
CREATE POLICY "Enable read access for all users" ON games
  FOR SELECT USING (true);

-- Allow both authenticated and anonymous users to create games
CREATE POLICY "Users can insert their own games or anonymous games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own games, and allow anonymous game updates
CREATE POLICY "Users can update their own games or anonymous games" ON games
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- API Keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

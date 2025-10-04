-- Make user_id optional in games table to allow anonymous game sharing
-- This allows both logged-in and logged-out users to create and share games

-- Make user_id nullable
ALTER TABLE games
ALTER COLUMN user_id DROP NOT NULL;

-- Ensure RLS is enabled on games table
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Update the insert policy to allow anonymous users to create games
DROP POLICY IF EXISTS "Users can insert their own games" ON games;

CREATE POLICY "Users can insert their own games or anonymous games"
ON games
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

-- Update the update policy to allow users to update their own games or allow updates to anonymous games
DROP POLICY IF EXISTS "Users can update their own games" ON games;

CREATE POLICY "Users can update their own games or anonymous games"
ON games
FOR UPDATE
USING (
  auth.uid() = user_id OR user_id IS NULL
)
WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);

-- Note: Read access is already public via the "Enable read access for all users" policy

-- Allow public read access to games table for game sharing
-- This allows non-logged-in users to view shared game replays

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable read access for all users" ON games;

-- Create new policy allowing anyone to read games
CREATE POLICY "Enable read access for all users"
ON games
FOR SELECT
USING (true);

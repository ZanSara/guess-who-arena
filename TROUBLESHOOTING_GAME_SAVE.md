# Troubleshooting Game Save Issues

If games are being created but messages aren't being saved, follow these steps:

## 1. Check Browser Console

Open the browser developer console (F12) and look for:
- `Updating game in DB:` - Should show the game ID and conversation length
- `Failed to update game - Supabase error:` - Will show any RLS or permission errors
- `Game updated successfully:` - Confirms the update worked

## 2. Apply Database Migrations

Make sure you've run ALL migrations in the correct order:

```sql
-- First, run: supabase/migrations/add_public_game_read_policy.sql
-- Then, run: supabase/migrations/make_user_id_optional.sql
```

## 3. Verify RLS Policies in Supabase Dashboard

Go to your Supabase dashboard → Table Editor → games table → Policies

You should see these policies:

### INSERT Policy
```
Name: Users can insert their own games or anonymous games
USING: (none)
WITH CHECK: (auth.uid() = user_id) OR (user_id IS NULL)
```

### UPDATE Policy
```
Name: Users can update their own games or anonymous games
USING: (auth.uid() = user_id) OR (user_id IS NULL)
WITH CHECK: (auth.uid() = user_id) OR (user_id IS NULL)
```

### SELECT Policy
```
Name: Enable read access for all users
USING: true
WITH CHECK: (none)
```

## 4. Verify Table Schema

In Supabase dashboard → Table Editor → games table → Columns

The `user_id` column should be:
- Type: `uuid`
- Nullable: `YES` (checked)
- Default: `NULL`

## 5. Test Anonymous Updates Directly

Run this in the Supabase SQL Editor:

```sql
-- Create a test game as anonymous user
INSERT INTO games (user_id, user_character, llm_character, model_name, conversation, user_eliminated, llm_eliminated)
VALUES (NULL, 'Alice', 'Bob', 'gpt-4o', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
RETURNING id;

-- Copy the returned ID and update the game
UPDATE games
SET conversation = '[{"role": "test", "content": "test message"}]'::jsonb
WHERE id = 'PASTE-THE-ID-HERE';

-- Verify the update worked
SELECT conversation FROM games WHERE id = 'PASTE-THE-ID-HERE';
```

If this fails, the RLS policies aren't configured correctly.

## 6. Common Issues

### Issue: "Failed to update game - Supabase error: new row violates row-level security policy"
**Solution:** Run the `make_user_id_optional.sql` migration

### Issue: "Failed to update game - Supabase error: null value in column user_id violates not-null constraint"
**Solution:** Run `ALTER TABLE games ALTER COLUMN user_id DROP NOT NULL;`

### Issue: Updates work when logged in but not when anonymous
**Solution:** Check that the UPDATE policy includes `OR user_id IS NULL`

## 7. Enable Supabase Logs

In your Supabase dashboard:
1. Go to Logs → Postgres Logs
2. Filter for errors
3. Look for RLS policy violations or constraint errors

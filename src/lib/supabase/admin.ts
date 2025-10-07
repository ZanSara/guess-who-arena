import { createClient } from '@supabase/supabase-js';

// This admin client is for server-side operations that need to bypass RLS.
// It uses the service role key, which should be kept secret.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

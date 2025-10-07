import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Auth user error:', error);
    return NextResponse.json({ user: null });
  }
}

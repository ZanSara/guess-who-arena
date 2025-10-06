import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, baseUrl} = await request.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Encrypt the API key server-side
    const keyEncrypted = encryptApiKey(apiKey);

    // Check if key already exists
    const { data: existing } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Update existing key
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({
          key_encrypted: keyEncrypted,
          base_url: baseUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating API key:', updateError);
        return NextResponse.json(
          { error: 'Failed to update API key' },
          { status: 500 }
        );
      }
    } else {
      // Insert new key
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_encrypted: keyEncrypted,
          base_url: baseUrl || null
        });

      if (insertError) {
        console.error('Error inserting API key:', insertError);
        return NextResponse.json(
          { error: 'Failed to save API key' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API key set error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

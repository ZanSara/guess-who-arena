import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptApiKey } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const { id, name, modelName, provider = 'openai', apiKey, baseUrl } = await request.json();

    if (!name || !modelName || !apiKey) {
      return NextResponse.json(
        { error: 'Name, model name, and API key are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const keyEncrypted = encryptApiKey(apiKey);

    if (id) {
      // Update existing configuration
      let query = supabase
        .from('ai_configurations')
        .update({
          name,
          model_name: modelName,
          provider,
          key_encrypted: keyEncrypted,
          base_url: baseUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.is('user_id', null);
      }

      const { error: updateError } = await query;

      if (updateError) {
        console.error('Error updating AI config:', updateError);
        return NextResponse.json(
          { error: 'Failed to update AI configuration' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, id });
    } else {
      // Insert new configuration
      const { data: newConfig, error: insertError } = await supabase
        .from('ai_configurations')
        .insert({
          user_id: user ? user.id : null,
          name,
          model_name: modelName,
          provider,
          key_encrypted: keyEncrypted,
          base_url: baseUrl || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting AI config:', insertError);
        return NextResponse.json(
          { error: 'Failed to save AI configuration' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, id: newConfig.id });
    }
  } catch (error) {
    console.error('AI config set error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
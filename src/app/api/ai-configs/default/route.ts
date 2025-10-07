import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get default AI configuration ID
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('default_ai_config_id')
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error loading preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to load preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      defaultConfigId: prefs?.default_ai_config_id || null
    });
  } catch (error) {
    console.error('Get default config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Set default AI configuration
export async function POST(request: NextRequest) {
  try {
    const { configId } = await request.json();

    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the config belongs to this user
    const { data: config, error: configError } = await supabase
      .from('ai_configurations')
      .select('id')
      .eq('id', configId)
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    // Upsert user preferences
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        default_ai_config_id: configId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error setting default config:', upsertError);
      return NextResponse.json(
        { error: 'Failed to set default configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

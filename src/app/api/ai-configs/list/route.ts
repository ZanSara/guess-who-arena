import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('ai_configurations')
      .select('id, name, model_name, provider, base_url, created_at, updated_at');

    if (user) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.is('user_id', null);
    }

    query = query.order('created_at', { ascending: false });

    const { data: configs, error: configError } = await query;

    if (configError) {
      console.error('Error loading AI configs:', configError);
      return NextResponse.json(
        { error: 'Failed to load AI configurations' },
        { status: 500 }
      );
    }

    let configsWithDefault = configs || [];

    if (user) {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('default_ai_config_id')
        .eq('user_id', user.id)
        .single();

      const defaultConfigId = prefs?.default_ai_config_id;

      if (defaultConfigId) {
        configsWithDefault = (configs || []).map(config => ({
          ...config,
          isDefault: config.id === defaultConfigId
        }));
      }
    }

    return NextResponse.json({ configs: configsWithDefault });
  } catch (error) {
    console.error('AI config list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
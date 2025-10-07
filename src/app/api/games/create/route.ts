import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CHARACTERS } from '@/lib/constants';
import { shuffleArray } from '@/lib/utils';
import { getImageAsBase64Server } from '@/lib/utils.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gameType = 'human_vs_ai',
      player1Id,
      player2Id,
      player2Type = 'human',
      apiKey,
      baseUrl,
      ai1ApiKey,
      ai1BaseUrl,
      ai2ApiKey,
      ai2BaseUrl
    } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Select characters
    const shuffled = shuffleArray([...CHARACTERS]);
    const userChar = shuffled[0];
    const llmChar = shuffled[1];

    // Load default prompt
    let systemPrompt = '';
    try {
      const promptResponse = await fetch(new URL('/prompts/simple.txt', request.url).href);
      if (promptResponse.ok) {
        systemPrompt = await promptResponse.text();
      }
    } catch (error) {
      console.error('Failed to load default prompt:', error);
      return NextResponse.json(
        { error: 'Failed to load system prompt' },
        { status: 500 }
      );
    }

    // Get model name - for authenticated users, need to load it from AI config
    let modelName = 'gpt-4o-mini';
    if (user && player1Id) {
      const { data: configData } = await supabase
        .from('ai_configurations')
        .select('model_name')
        .eq('id', player1Id)
        .single();

      if (configData) {
        modelName = configData.model_name;
      }
    }

    // Create game record with appropriate fields
    const gameData: any = {
      user_id: user?.id || null,
      user_character: userChar,
      llm_character: llmChar,
      model_name: modelName,
      winner: null,
      conversation: [],
      user_eliminated: [],
      llm_eliminated: [],
      game_type: gameType
    };

    // Add player fields based on game type
    if (gameType === 'human_vs_ai' && player1Id) {
      gameData.player_1_id = player1Id;
      gameData.player_2_type = 'human';
    } else if (gameType === 'ai_vs_ai' && player1Id && player2Id) {
      gameData.player_1_id = player1Id;
      gameData.player_2_id = player2Id;
      gameData.player_2_type = 'ai';
    }

    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single();

    if (createError || !newGame) {
      console.error('Failed to create game record:', createError);
      return NextResponse.json(
        { error: 'Failed to create game record' },
        { status: 500 }
      );
    }

    // Load images
    const boardBase64 = await getImageAsBase64Server('/full-board.png');
    const llmCharBase64 = await getImageAsBase64Server(`/characters/${llmChar}.png`);

    // Initialize conversation
    const initialConversation = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Here is the full board and your character. Let\'s start!' },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${boardBase64}` }
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${llmCharBase64}` }
          }
        ]
      }
    ];

    // Update game with initial conversation
    await supabase
      .from('games')
      .update({
        conversation: initialConversation,
        updated_at: new Date().toISOString()
      })
      .eq('id', newGame.id);

    return NextResponse.json({
      success: true,
      gameId: newGame.id
    });
  } catch (error) {
    console.error('Game creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

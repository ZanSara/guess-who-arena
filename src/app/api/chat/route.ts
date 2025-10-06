import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { TOOLS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { decryptApiKey, EncryptedData } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const { messages, model, apiKey: clientApiKey, baseUrl: clientBaseUrl } = await request.json();

    let apiKey: string;
    let baseUrl: string | undefined;

    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Authenticated user - load encrypted API key from database
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('key_encrypted, base_url')
        .eq('user_id', user.id)
        .single();

      if (keyError || !keyData) {
        return new Response('API key not configured. Please set your API key in settings.', { status: 400 });
      }

      // Decrypt API key server-side
      try {
        apiKey = decryptApiKey(keyData.key_encrypted as EncryptedData);
        baseUrl = keyData.base_url || undefined;
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
        return new Response('Failed to decrypt API key', { status: 500 });
      }
    } else {
      // Anonymous user - use API key from request body
      if (!clientApiKey) {
        return new Response('API key is required', { status: 400 });
      }
      apiKey = clientApiKey;
      baseUrl = clientBaseUrl;
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      ...(baseUrl && { baseURL: baseUrl }),
    });

    const response = await openai.chat.completions.create({
      model: model || 'gpt-5-mini',
      messages: messages,
      tools: TOOLS,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`)
              );
            }

            if (delta?.tool_calls) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'tool_calls', tool_calls: delta.tool_calls })}\n\n`)
              );
            }

            if (chunk.choices[0]?.finish_reason) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done', finish_reason: chunk.choices[0].finish_reason })}\n\n`)
              );
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Streaming failed' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

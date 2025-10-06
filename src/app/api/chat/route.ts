import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { TOOLS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { messages, model, apiKey, baseUrl } = await request.json();

    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
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

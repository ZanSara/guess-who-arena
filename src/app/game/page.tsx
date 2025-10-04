'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Character, CHARACTERS } from '@/lib/constants';
import { shuffleArray, getImageAsBase64 } from '@/lib/utils';
import GameBoard from '@/components/GameBoard';
import ChatInterface, { Message } from '@/components/ChatInterface';

interface ConversationMessage {
  role: string;
  content: string | null | { type: string; text?: string; image_url?: { url: string } }[];
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

export default function GamePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [userCharacter, setUserCharacter] = useState<Character | null>(null);
  const [llmCharacter, setLlmCharacter] = useState<Character | null>(null);
  const [userEliminated, setUserEliminated] = useState<Set<Character>>(new Set());
  const [llmEliminated, setLlmEliminated] = useState<Set<Character>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'user-board' | 'llm-board'>('chat');
  const [gameEnded, setGameEnded] = useState(false);

  // Settings
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [model] = useState<string>('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState<string>('');

  // Image cache
  const imageCache = useRef<Map<string, string>>(new Map());
  const conversationHistory = useRef<ConversationMessage[]>([]);

  useEffect(() => {
    checkUser();
    loadSettings();
    loadDefaultPrompt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Load from Supabase for authenticated users
      const { data } = await supabase
        .from('api_keys')
        .select('api_key, base_url')
        .eq('user_id', user.id)
        .eq('provider', 'openai')
        .single();

      if (data) {
        setApiKey(data.api_key);
        if (data.base_url) setBaseUrl(data.base_url);
      }
    } else {
      // Load from localStorage for anonymous users
      const storedApiKey = localStorage.getItem('openai_api_key');
      const storedBaseUrl = localStorage.getItem('openai_base_url');
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
      if (storedBaseUrl) {
        setBaseUrl(storedBaseUrl);
      }
    }
  }

  async function loadDefaultPrompt() {
    // Check if we have a stored prompt from localStorage (for anonymous users)
    const storedPrompt = localStorage.getItem('system_prompt');
    if (storedPrompt) {
      setSystemPrompt(storedPrompt);
      return;
    }

    // Otherwise load the default prompt
    try {
      const response = await fetch('/prompts/simple.txt');
      if (response.ok) {
        const text = await response.text();
        setSystemPrompt(text);
      }
    } catch (error) {
      console.error('Failed to load default prompt:', error);
    }
  }

  async function getImageBase64(imageName: string): Promise<string> {
    if (imageCache.current.has(imageName)) {
      return imageCache.current.get(imageName)!;
    }

    const base64 = await getImageAsBase64(`/characters/${imageName}.png`);
    if (base64) {
      imageCache.current.set(imageName, base64);
      return base64;
    }
    return '';
  }

  async function startGame() {
    if (!apiKey) {
      alert('Please configure your OpenAI API key in settings first.');
      router.push('/settings');
      return;
    }

    // Reset game state
    setGameStarted(false);
    setGameEnded(false);
    setUserEliminated(new Set());
    setLlmEliminated(new Set());
    setMessages([]);
    conversationHistory.current = [];

    // Select characters
    const shuffled = shuffleArray([...CHARACTERS]);
    const userChar = shuffled[0];
    const llmChar = shuffled[1];
    setUserCharacter(userChar);
    setLlmCharacter(llmChar);

    // Load images
    const boardBase64 = await getImageAsBase64('/full-board.png');
    const llmCharBase64 = await getImageBase64(llmChar);

    // Initialize conversation with system prompt and images
    conversationHistory.current = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Here is the full board and your character. Let&apos;s start!' },
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

    setGameStarted(true);
    setActiveTab('chat');

    // Send initial message to LLM
    await sendToLLM();
  }

  async function sendToLLM() {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory.current,
          model,
          apiKey,
          baseUrl
        })
      });

      if (!response.ok) throw new Error('Chat request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantMessage = '';
      const toolCalls: { id: string; type: 'function'; function: { name: string; arguments: string } }[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'content') {
                  assistantMessage += data.content;
                  // Update UI in real-time
                  setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                      newMessages[newMessages.length - 1].content = assistantMessage;
                    } else {
                      newMessages.push({ role: 'assistant', content: assistantMessage });
                    }
                    return newMessages;
                  });
                } else if (data.type === 'tool_calls') {
                  // Accumulate tool calls
                  for (const tc of data.tool_calls) {
                    if (tc.index !== undefined) {
                      if (!toolCalls[tc.index]) {
                        toolCalls[tc.index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                      }
                      if (tc.id) toolCalls[tc.index].id = tc.id;
                      if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                      if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                  }
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      // Add assistant message to history
      conversationHistory.current.push({
        role: 'assistant',
        content: toolCalls.length > 0 ? (assistantMessage || null) : assistantMessage,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls })
      });

      // Handle tool calls
      if (toolCalls.length > 0) {
        await handleToolCalls(toolCalls);
      }

    } catch (error) {
      console.error('Error communicating with LLM:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Error: Failed to communicate with the LLM. Please check your settings.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleToolCalls(toolCalls: { id: string; type: 'function'; function: { name: string; arguments: string } }[]) {
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (functionName === 'eliminateCharacter') {
        const charName = args.characterName;
        if (CHARACTERS.includes(charName as Character)) {
          setLlmEliminated(prev => new Set([...prev, charName as Character]));
          conversationHistory.current.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: `Successfully eliminated ${charName} from your board.`
          });
        } else {
          conversationHistory.current.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: `Error: ${charName} is not a valid character name.`
          });
        }
      } else if (functionName === 'endGame') {
        const gameWinner = args.winner as 'user' | 'llm';
        setGameEnded(true);

        const winMessage = gameWinner === 'user'
          ? '🎉 You won! The LLM correctly identified that you guessed their character.'
          : '😔 The LLM won! They guessed your character.';

        setMessages(prev => [...prev, { role: 'system', content: winMessage }]);

        conversationHistory.current.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: `Game ended. Winner: ${gameWinner}`
        });

        // Save game to database only for authenticated users
        if (isAuthenticated && user) {
          await supabase.from('games').insert({
            user_id: user.id,
            user_character: userCharacter,
            llm_character: llmCharacter,
            model_name: model,
            winner: gameWinner,
            conversation: conversationHistory.current,
            user_eliminated: Array.from(userEliminated),
            llm_eliminated: Array.from(llmEliminated),
            completed_at: new Date().toISOString()
          });
        }
      }
    }

    // Continue conversation if tool calls were processed
    if (!gameEnded) {
      await sendToLLM();
    }
  }

  async function handleSendMessage(message: string) {
    if (!gameStarted || gameEnded) return;

    // Add user message to UI and history
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    conversationHistory.current.push({
      role: 'user',
      content: message
    });

    // Send to LLM
    await sendToLLM();
  }

  function handleCharacterClick(character: Character) {
    if (gameEnded) return;

    setUserEliminated(prev => {
      const newSet = new Set(prev);
      if (newSet.has(character)) {
        newSet.delete(character);
      } else {
        newSet.add(character);
      }
      return newSet;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/10 backdrop-blur-md text-white py-6 text-center border-b border-white/20">
        <h1 className="text-3xl font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
          Play &quot;Guess Who&quot; with LLMs!
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center mt-6 px-4 pb-6">
        {!gameStarted ? (
          <div className="flex flex-col items-center justify-center gap-4 mt-20">
            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white text-xl font-semibold rounded-full hover:from-green-600 hover:to-green-700 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              Start Game!
            </button>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 bg-white/80 text-indigo-600 rounded-2xl border border-indigo-200 hover:bg-white hover:-translate-y-0.5 transition-all font-semibold"
              >
                Settings
              </button>
              <button
                onClick={() => router.push('/help')}
                className="px-4 py-2 bg-white/80 text-indigo-600 rounded-2xl border border-indigo-200 hover:bg-white hover:-translate-y-0.5 transition-all font-semibold"
              >
                Help
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            <div className="flex gap-2 mb-4 bg-white/95 p-2 rounded-xl shadow-md backdrop-blur-md border border-white/30">
              <button
                onClick={() => setActiveTab('user-board')}
                className={`tab-button ${activeTab === 'user-board' ? 'active' : ''}`}
              >
                Your Board
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('llm-board')}
                className={`tab-button ${activeTab === 'llm-board' ? 'active' : ''}`}
              >
                AI&apos;s Board
              </button>
            </div>

            <div className="bg-white/95 rounded-xl shadow-lg backdrop-blur-md border border-white/30 p-4">
              {activeTab === 'chat' && (
                <div>
                  <div className="mb-4 p-3 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 rounded-lg border border-indigo-200/20 text-center text-sm">
                    Playing against: <span className="font-bold">{model}</span>
                    <button
                      onClick={() => router.push('/settings')}
                      className="ml-3 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => router.push('/help')}
                      className="ml-3 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Help
                    </button>
                  </div>
                  <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                    disabled={!gameStarted || gameEnded}
                  />
                </div>
              )}

              {activeTab === 'user-board' && (
                <GameBoard
                  title="Your Board"
                  selectedCharacter={userCharacter}
                  eliminatedCharacters={userEliminated}
                  onCharacterClick={handleCharacterClick}
                  showSelectedName={true}
                />
              )}

              {activeTab === 'llm-board' && (
                <GameBoard
                  title="AI's Board"
                  selectedCharacter={llmCharacter}
                  eliminatedCharacters={llmEliminated}
                  showSelectedName={false}
                />
              )}

              {gameEnded && (
                <div className="mt-4 text-center">
                  <button
                    onClick={startGame}
                    className="px-8 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold rounded-full hover:from-green-600 hover:to-green-700 shadow-lg transition-all hover:-translate-y-1"
                  >
                    Play Again!
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="text-white text-center py-4">
        <p className="text-sm mb-2">
              Made by 
              <a href="https://zansara.dev" target="_blank"> <img src="https://zansara.dev/me/avatar.svg" className="inline-block h-5 w-5 mx-1"/><b>Sara Zan</b> </a> 
              with the help of
              <a href="https://www.anthropic.com/claude-code" className="inline-block h-5 w-5" target="_blank">🤖</a>
              <a href="https://github.com/google-gemini/gemini-cli" className="inline-block h-5 w-5" target="_blank">🤖</a>
          </p>
          <p className="mb-5">
              <a href="https://github.com/ZanSara/guess-who" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 512 512" className="inline-block h-5 w-5 mx-1">
                      <path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path>
                  </svg>
              </a>
              <a href="https://x.com/zansara_dev" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 512 512" className="inline-block h-5 w-5 mx-1">
                      <path fill="currentColor" d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
                  </svg>
              </a> 
              <a href="https://bsky.app/profile/zansara.bsky.social" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 512 512" className="inline-block h-5 w-5 mx-1">
                      <path fill="currentColor" d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.2 298 412 314.6 353.1 304.5c102.9 17.5 129.1 75.5 72.5 133.5c-107.4 110.2-154.3-27.6-166.3-62.9l0 0c-1.7-4.9-2.6-7.8-3.3-7.8s-1.6 3-3.3 7.8l0 0c-12 35.3-59 173.1-166.3 62.9c-56.5-58-30.4-116 72.5-133.5C100 314.6 33.8 298 15.7 233.1C10.4 214.4 1.5 99.4 1.5 83.9c0-77.8 68.2-53.4 110.3-21.8z"></path>
                  </svg>
              </a> 
              <a href="https://mastodon.social/@zansara" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 512 512" className="inline-block h-5 w-5 mx-1">
                      <path fill="currentColor" d="M433 179.1c0-97.2-63.7-125.7-63.7-125.7-62.5-28.7-228.6-28.4-290.5 0 0 0-63.7 28.5-63.7 125.7 0 115.7-6.6 259.4 105.6 289.1 40.5 10.7 75.3 13 103.3 11.4 50.8-2.8 79.3-18.1 79.3-18.1l-1.7-36.9s-36.3 11.4-77.1 10.1c-40.4-1.4-83-4.4-89.6-54a102.5 102.5 0 0 1 -.9-13.9c85.6 20.9 158.7 9.1 178.8 6.7 56.1-6.7 105-41.3 111.2-72.9 9.8-49.8 9-121.5 9-121.5zm-75.1 125.2h-46.6v-114.2c0-49.7-64-51.6-64 6.9v62.5h-46.3V197c0-58.5-64-56.6-64-6.9v114.2H90.2c0-122.1-5.2-147.9 18.4-175 25.9-28.9 79.8-30.8 103.8 6.1l11.6 19.5 11.6-19.5c24.1-37.1 78.1-34.8 103.8-6.1 23.7 27.3 18.4 53 18.4 175z"></path>
                  </svg>
              </a>
              <a href="https://zansara.substack.com/" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 512 512" className="inline-block h-5 w-5 mx-1">
                      <path fill="currentColor" d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z"></path>
                  </svg>
              </a>
              <a href="https://www.linkedin.com/in/sarazanzottera/" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 512 512" className="inline-block h-5 w-5 mx-1">
                      <path fill="currentColor" d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"></path>
                  </svg>
              </a>
          </p>
      </footer>
    </div>
  );
}

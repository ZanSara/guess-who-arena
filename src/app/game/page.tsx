'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Character, CHARACTERS } from '@/lib/constants';
import { shuffleArray, getImageAsBase64 } from '@/lib/utils';
import GameBoard from '@/components/GameBoard';
import ChatInterface, { Message } from '@/components/ChatInterface';

import Footer from '@/components/Footer';

import Header from '@/components/Header';

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
      <Header title="Guess Who Arena" />

      <div className="flex-1 flex flex-col items-center mt-6 px-4 pb-6">
        {!gameStarted ? (
          <div className="flex flex-col items-center justify-center gap-4 mt-20">
            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white text-xl font-semibold rounded-full hover:from-green-600 hover:to-green-700 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              Start Game!
            </button>
            
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

      <Footer />
    </div>
  );
}

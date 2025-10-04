'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Character, CHARACTERS } from '@/lib/constants';
import { shuffleArray, getImageAsBase64 } from '@/lib/utils';
import GameBoard from '@/components/GameBoard';
import ChatInterface, { Message } from '@/components/ChatInterface';
import GameResultModal from '@/components/GameResultModal';

import Footer from '@/components/Footer';

import Header from '@/components/Header';

interface ConversationMessage {
  role: string;
  content: string | null | { type: string; text?: string; image_url?: { url: string } }[];
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
}

export default function GamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Replay mode
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayGameId, setReplayGameId] = useState<string | null>(null);

  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [userCharacter, setUserCharacter] = useState<Character | null>(null);
  const [llmCharacter, setLlmCharacter] = useState<Character | null>(null);
  const [userEliminated, setUserEliminated] = useState<Set<Character>>(new Set());
  const [llmEliminated, setLlmEliminated] = useState<Set<Character>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'user-board' | 'llm-board'>('chat');
  const [gameEnded, setGameEnded] = useState(false);
  const [gameWinner, setGameWinner] = useState<'user' | 'llm' | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [replayModelName, setReplayModelName] = useState<string>('');

  // Settings
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [model] = useState<string>('gpt-5-mini');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [revealLlmCharacter, setRevealLlmCharacter] = useState(false);

  // Image cache
  const imageCache = useRef<Map<string, string>>(new Map());
  const conversationHistory = useRef<ConversationMessage[]>([]);

  useEffect(() => {
    checkUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSettings();
      loadDefaultPrompt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const gameId = searchParams.get('id');
    if (gameId) {
      setReplayGameId(gameId);
      loadReplayGame(gameId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      const storedRevealLlmCharacter = localStorage.getItem('reveal_llm_character');
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
      if (storedBaseUrl) {
        setBaseUrl(storedBaseUrl);
      }
      if (storedRevealLlmCharacter) {
        setRevealLlmCharacter(storedRevealLlmCharacter === 'true');
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

  async function loadReplayGame(gameId: string) {
    try {
      // Load game data from Supabase (publicly accessible)
      const { data: game, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error || !game) {
        console.error('Failed to load game:', error);
        alert('Game not found or could not be loaded.');
        return;
      }

      // Set replay mode
      setIsReplayMode(true);
      setGameStarted(true);
      setGameEnded(true);

      // Load game state
      setUserCharacter(game.user_character as Character);
      setLlmCharacter(game.llm_character as Character);
      setUserEliminated(new Set(game.user_eliminated as Character[]));
      setLlmEliminated(new Set(game.llm_eliminated as Character[]));
      setGameWinner(game.winner);
      setReplayModelName(game.model_name);

      // Convert conversation to messages for display
      const displayMessages: Message[] = [];
      if (game.conversation) {
        for (const msg of game.conversation) {
          // Skip system messages and messages with images
          if (msg.role === 'system') continue;
          if (typeof msg.content === 'object') continue;
          if (msg.role === 'tool') continue;

          // Handle assistant messages with tool calls
          if (msg.role === 'assistant' && msg.tool_calls) {
            // Add assistant message if there's content
            if (msg.content) {
              displayMessages.push({
                role: 'assistant',
                content: msg.content as string
              });
            }

            // Add tool call messages
            for (const toolCall of msg.tool_calls) {
              const functionName = toolCall.function.name;
              const args = JSON.parse(toolCall.function.arguments);

              let toolCallContent = '';
              if (functionName === 'eliminateCharacter') {
                toolCallContent = `character=${args.characterName}`;
              } else if (functionName === 'endGame') {
                toolCallContent = `winner=${args.winner}`;
              }

              displayMessages.push({
                role: 'tool-call',
                content: toolCallContent,
                toolName: functionName
              });
            }
          } else if (msg.role === 'user' || msg.role === 'assistant') {
            // Regular user or assistant message
            displayMessages.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content as string
            });
          }
        }
      }
      setMessages(displayMessages);
      setActiveTab('chat');
    } catch (error) {
      console.error('Error loading replay game:', error);
      alert('Failed to load game.');
    }
  }

  async function updateGameInDB() {
    if (!currentGameId) {
      console.error('No currentGameId - cannot update game');
      return;
    }

    console.log('Updating game in DB:', currentGameId, 'Conversation length:', conversationHistory.current.length);

    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          conversation: conversationHistory.current,
          user_eliminated: Array.from(userEliminated),
          llm_eliminated: Array.from(llmEliminated),
          winner: gameWinner,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGameId)
        .select();

      if (error) {
        console.error('Failed to update game - Supabase error:', error);
      } else {
        console.log('Game updated successfully:', data);
      }
    } catch (error) {
      console.error('Failed to update game - Exception:', error);
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
    setGameWinner(null);
    setShowResultModal(false);
    setCurrentGameId(null);
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

    // Create game record in database
    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert({
        user_id: user?.id || null,
        user_character: userChar,
        llm_character: llmChar,
        model_name: model,
        winner: null,
        conversation: [],
        user_eliminated: [],
        llm_eliminated: []
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create game record:', createError);
      alert('Failed to create game record. Please try again.');
      return;
    }

    if (newGame) {
      setCurrentGameId(newGame.id);
    }

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

    // Update game with initial conversation immediately
    console.log('Saving initial conversation to game:', newGame.id, 'Conversation length:', conversationHistory.current.length);
    const { error: updateError } = await supabase
      .from('games')
      .update({
        conversation: conversationHistory.current,
        updated_at: new Date().toISOString()
      })
      .eq('id', newGame.id);

    if (updateError) {
      console.error('Failed to save initial conversation:', updateError);
    } else {
      console.log('Initial conversation saved successfully');
    }

    setGameStarted(true);
    setActiveTab('chat');

    // Send initial message to LLM
    await sendToLLM();
  }

  async function sendToLLM() {
    setIsProcessing(true);

    console.log('=== CALLING sendToLLM ===');
    console.log('Conversation history length:', conversationHistory.current.length);
    conversationHistory.current.forEach((msg, idx) => {
      console.log(`History ${idx}:`, {
        role: msg.role,
        hasContent: !!msg.content,
        contentType: typeof msg.content,
        hasToolCalls: !!msg.tool_calls,
        tool_call_id: msg.tool_call_id,
        name: msg.name
      });
    });

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

      // Update game in database
      await updateGameInDB();

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

        // Add tool call message to UI
        setMessages(prev => [...prev, {
          role: 'tool-call',
          content: `character=${charName}`,
          toolName: 'eliminateCharacter'
        }]);

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
        const winner = args.winner as 'user' | 'llm';

        // Add tool call message to UI
        setMessages(prev => [...prev, {
          role: 'tool-call',
          content: `winner=${winner}`,
          toolName: 'endGame'
        }]);

        setGameEnded(true);
        setGameWinner(winner);
        setShowResultModal(true);

        conversationHistory.current.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: `Game ended. Winner: ${winner}`
        });

        // Update game in database with final state
        if (currentGameId) {
          await supabase
            .from('games')
            .update({
              conversation: conversationHistory.current,
              user_eliminated: Array.from(userEliminated),
              llm_eliminated: Array.from(llmEliminated),
              winner: winner,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', currentGameId);
        }
      }
    }

    // Update game in database after tool calls (except if game just ended, already updated above)
    if (!gameEnded) {
      await updateGameInDB();
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

    // Update game in database
    await updateGameInDB();

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

      // Update DB with new eliminated state
      setTimeout(() => {
        if (currentGameId) {
          supabase
            .from('games')
            .update({
              user_eliminated: Array.from(newSet),
              updated_at: new Date().toISOString()
            })
            .eq('id', currentGameId);
        }
      }, 0);

      return newSet;
    });
  }

  async function handleShare() {
    if (!currentGameId) {
      alert('No game to share yet!');
      return;
    }

    const shareUrl = `${window.location.origin}/game?id=${currentGameId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show the URL in a prompt
      prompt('Copy this link to share:', shareUrl);
    }
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
      <Header/>

      <div className="flex-1 flex flex-col items-center mt-6 px-4 pb-6">
        {!gameStarted && !isReplayMode ? (
          <div className="flex flex-col items-center justify-center gap-4 mt-20">
            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-br from-green-500 to-green-600 text-white text-xl font-semibold rounded-full hover:from-green-600 hover:to-green-700 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              Start Game!
            </button>

          </div>
        ) : gameStarted || isReplayMode ? (
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
                  {isReplayMode ? (
                    <div className="mb-4 p-3 bg-gradient-to-r from-amber-100/50 to-orange-100/50 rounded-lg border border-amber-200/20 text-center text-sm">
                      📽️ <span className="font-bold">Replay Mode</span> - Viewing past game against {replayModelName}
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 rounded-lg border border-indigo-200/20 text-sm flex items-center justify-between">
                      <div className="flex-1 text-center">
                        Playing against: <span className="font-bold">{model}</span>
                      </div>
                      {currentGameId && (
                        <button
                          onClick={handleShare}
                          className="ml-2 px-3 py-1 bg-white/80 hover:bg-white text-indigo-600 rounded-md text-xs font-semibold transition-colors shadow-sm"
                          title="Share this game"
                        >
                          🔗 Share
                        </button>
                      )}
                    </div>
                  )}
                  <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isProcessing={isProcessing}
                    disabled={isReplayMode || !gameStarted || gameEnded}
                    onNewGame={startGame}
                  />
                </div>
              )}

              {activeTab === 'user-board' && (
                <GameBoard
                  selectedCharacter={userCharacter}
                  eliminatedCharacters={userEliminated}
                  onCharacterClick={isReplayMode ? undefined : handleCharacterClick}
                  showSelectedName={true}
                />
              )}

              {activeTab === 'llm-board' && (
                <GameBoard
                  selectedCharacter={llmCharacter}
                  eliminatedCharacters={llmEliminated}
                  showSelectedName={isReplayMode || revealLlmCharacter}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      {showResultModal && gameWinner && !isReplayMode && (
        <GameResultModal
          isWinner={gameWinner === 'user'}
          onPlayAgain={startGame}
          onClose={() => {
            setShowResultModal(false);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

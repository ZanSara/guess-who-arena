'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import Footer from '@/components/Footer';

import Header from '@/components/Header';

interface Game {
  id: string;
  user_character: string;
  llm_character: string;
  model_name: string;
  winner: 'user' | 'llm' | null;
  conversation: { role: string; content: string | object }[];
  user_eliminated: string[];
  llm_eliminated: string[];
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    checkUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      loadGames();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to auth if trying to access history without login
      router.push('/auth');
      return;
    }
    setUser(user);
    setLoading(false);
  }

  async function loadGames() {
    if (!user) return;

    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setGames(data);
    }
  }

  function viewGameDetails(game: Game) {
    setSelectedGame(game);
  }

  function closeGameDetails() {
    setSelectedGame(null);
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
      <Header title="Game History" />

      <div className="flex-1 flex flex-col items-center mt-6 px-4 pb-6">
        <div className="w-full max-w-6xl">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => router.push('/game')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Game
              </button>
            </div>
            {games.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg">No games played yet.</p>
                <p className="text-sm mt-2">Start a game to see your history here!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => viewGameDetails(game)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            game.winner === 'user'
                              ? 'bg-green-100 text-green-800'
                              : game.winner === 'llm'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {game.winner === 'user' ? '🎉 Won' : game.winner === 'llm' ? '😔 Lost' : 'Incomplete'}
                          </span>
                          <span className="text-sm text-gray-600">{game.model_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Your Character: <span className="font-semibold">{game.user_character}</span></p>
                          <p>LLM&apos;s Character: <span className="font-semibold">{game.llm_character}</span></p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(game.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Game Details Modal */}
        {selectedGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Game Details</h2>
                <button
                  onClick={closeGameDetails}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Your Character</p>
                      <p className="font-semibold text-lg">{selectedGame.user_character}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">LLM&apos;s Character</p>
                      <p className="font-semibold text-lg">{selectedGame.llm_character}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Model</p>
                      <p className="font-semibold">{selectedGame.model_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Result</p>
                      <p className={`font-semibold ${
                        selectedGame.winner === 'user'
                          ? 'text-green-600'
                          : selectedGame.winner === 'llm'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        {selectedGame.winner === 'user' ? 'You Won!' : selectedGame.winner === 'llm' ? 'LLM Won' : 'Incomplete'}
                      </p>
                    </div>
                  </div>

                  {selectedGame.user_eliminated && selectedGame.user_eliminated.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Characters you eliminated:</p>
                      <p className="text-sm">{selectedGame.user_eliminated.join(', ')}</p>
                    </div>
                  )}

                  {selectedGame.llm_eliminated && selectedGame.llm_eliminated.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Characters LLM eliminated:</p>
                      <p className="text-sm">{selectedGame.llm_eliminated.join(', ')}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Conversation</h3>
                  <div className="space-y-3">
                    {selectedGame.conversation && selectedGame.conversation.map((msg: { role: string; content: string | object }, idx: number) => {
                      // Skip system messages and messages with images
                      if (msg.role === 'system') return null;
                      if (typeof msg.content === 'object') return null;

                      return (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : msg.role === 'assistant'
                                ? 'bg-gray-200 text-gray-900'
                                : 'bg-yellow-100 text-yellow-900 text-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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

export default function HistorySection() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);

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
    if (user) {
      setUser(user);
    }
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
    window.open(`/game?id=${game.id}`, '_blank');
  }

  if (loading) {
    return <div className="text-lg">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center text-gray-500 py-12">Please log in to see your game history.</div>
  }

  return (
    <div>
      {games.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg">No games played yet.</p>
          <p className="text-sm mt-2">Start a game to see your history here!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {games.map((game) => (
            <div
              key={game.id}
              className="border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => viewGameDetails(game)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500">
                     {new Date(game.created_at).toLocaleDateString()} {new Date(game.created_at).toLocaleTimeString()}
                    </div>
                    <span className={`text-sm font-semibold ${
                      game.winner === 'user'
                        ? 'text-green-600'
                        : game.winner === 'llm'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {game.winner === 'user' ? '🎉 Won' : game.winner === 'llm' ? '☠️ Lost' : 'Incomplete'}
                    </span>
                    <span className="text-sm text-gray-600"> against</span>
                    <span className="font-semibold text-sm text-gray-600"> {game.model_name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

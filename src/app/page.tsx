'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHARACTERS } from '@/lib/constants';
import { shuffleArray, getImageAsBase64 } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model] = useState('gpt-5-mini');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSettings();
      loadDefaultPrompt();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    }
    setLoading(false);
  }

  async function loadSettings() {
    if (user) {
      // Just check if API key exists (don't load the actual key)
      const { data } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setApiKey('configured'); // Just a flag to indicate key exists
      }

      // Clear localStorage for logged-in users (they should only use DB)
      localStorage.removeItem('guesswhoarena_api_key');
      localStorage.removeItem('guesswhoarena_base_url');
      localStorage.removeItem('guesswhoarena_model');
      localStorage.removeItem('guesswhoarena_system_prompt');
      localStorage.removeItem('guesswhoarena_reveal_llm_character');
    } else {
      const storedApiKey = localStorage.getItem('guesswhoarena_api_key');
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
    }
  }

  async function loadDefaultPrompt() {
    // Only check localStorage for anonymous users
    if (!user) {
      const storedPrompt = localStorage.getItem('guesswhoarena_system_prompt');
      if (storedPrompt) {
        setSystemPrompt(storedPrompt);
        return;
      }
    }

    // Load default prompt for logged-in users or if no stored prompt
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

  async function startGame() {
    if (!apiKey || apiKey.trim() === '') {
      alert('Please configure your OpenAI API key in settings first.');
      router.push('/settings');
      return;
    }

    if (!systemPrompt || systemPrompt.trim() === '') {
      alert('System prompt is missing. Please try again.');
      return;
    }

    // Select characters
    const shuffled = shuffleArray([...CHARACTERS]);
    const userChar = shuffled[0];
    const llmChar = shuffled[1];

    // Create game record
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

    if (createError || !newGame) {
      console.error('Failed to create game record:', createError);
      alert('Failed to create game record. Please try again.');
      return;
    }

    // Load images
    const boardBase64 = await getImageAsBase64('/full-board.png');
    const llmCharBase64 = await getImageAsBase64(`/characters/${llmChar}.png`);

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

    // Redirect to game
    router.push(`/game/${newGame.id}`);
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
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
        <div className="flex flex-col items-center justify-center gap-4">
          {(!apiKey || apiKey.trim() === '') && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center max-w-md">
              <p className="text-yellow-800 font-semibold mb-2">⚠️ API Key Required</p>
              <p className="text-yellow-700 text-sm">
                Please configure your OpenAI API key in settings before starting a game.
              </p>
              <button
                onClick={() => router.push('/settings')}
                className="mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-semibold transition-colors"
              >
                Go to Settings
              </button>
            </div>
          )}
          <button
            onClick={startGame}
            disabled={!apiKey || apiKey.trim() === ''}
            className={`px-12 py-4 text-white text-xl font-semibold rounded-full shadow-lg transition-all ${
              !apiKey || apiKey.trim() === ''
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:-translate-y-1 hover:shadow-xl'
            }`}
          >
            Start Game!
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

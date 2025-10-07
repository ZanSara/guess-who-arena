'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AIConfigSelector, { AIConfig } from '@/components/AIConfigSelector';
import Header from '@/components/Header';

export default function AIVsAISetup() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<AIConfig[]>([]);
  const [ai1Config, setAi1Config] = useState<AIConfig | null>(null);
  const [ai2Config, setAi2Config] = useState<AIConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    checkAuth();
    loadConfigs();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(!!data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/ai-configs/list');
      if (response.ok) {
        const data = await response.json();
        // Transform database format to component format
        const configs = data.configs.map((c: any) => ({
          id: c.id,
          name: c.name,
          modelName: c.model_name,
          provider: c.provider,
          baseUrl: c.base_url,
          isDefault: c.isDefault,
        }));
        setSavedConfigs(configs);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const handleSaveConfig = async (config: AIConfig) => {
    try {
      const response = await fetch('/api/ai-configs/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config.id && !config.id.startsWith('local-') ? config.id : undefined,
          name: config.name,
          modelName: config.modelName,
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      await loadConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      alert(`Failed to save configuration: ${error.message}`);
      throw error;
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const response = await fetch('/api/ai-configs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      await loadConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleStartGame = async () => {
    if (!ai1Config || !ai2Config) {
      alert('Please select or create both AI configurations');
      return;
    }

    if (ai1Config.id === ai2Config.id) {
      alert('Please select different AI configurations for each player');
      return;
    }

    setIsCreating(true);

    try {
      // Create new game
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'ai_vs_ai',
          player1Id: ai1Config.id,
          player2Id: ai2Config.id,
          player2Type: 'ai',
          // Include API keys for anonymous users
          ...((!isAuthenticated) && {
            ai1ApiKey: ai1Config.apiKey,
            ai1BaseUrl: ai1Config.baseUrl,
            ai2ApiKey: ai2Config.apiKey,
            ai2BaseUrl: ai2Config.baseUrl
          })
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = await response.json();
      router.push(`/game/${data.gameId}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI vs AI Battle
            </h1>
            <p className="text-gray-600">
              Watch two AI opponents compete against each other
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <AIConfigSelector
              value={ai1Config}
              onChange={setAi1Config}
              label="AI Player 1"
              isAuthenticated={isAuthenticated}
              savedConfigs={savedConfigs}
              onSaveConfig={handleSaveConfig}
              onDeleteConfig={handleDeleteConfig}
              mode="select"
            />

            <AIConfigSelector
              value={ai2Config}
              onChange={setAi2Config}
              label="AI Player 2"
              isAuthenticated={isAuthenticated}
              savedConfigs={savedConfigs}
              onSaveConfig={handleSaveConfig}
              onDeleteConfig={handleDeleteConfig}
              mode="select"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleStartGame}
              disabled={!ai1Config || !ai2Config || isCreating}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Game...' : 'Start AI Battle'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

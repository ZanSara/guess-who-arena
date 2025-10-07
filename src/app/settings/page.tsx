'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import CollapsibleSection from '@/components/CollapsibleSection';
import HistorySection from '@/components/HistorySection';
import AIConfigSelector, { AIConfig } from '@/components/AIConfigSelector';

interface CustomPrompt {
  id: string;
  name: string;
  prompt_text: string;
  model_name?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{id: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // AI Configurations
  const [savedConfigs, setSavedConfigs] = useState<AIConfig[]>([]);

  // Settings
  const [systemPrompt, setSystemPrompt] = useState('');
  const [revealLlmCharacter, setRevealLlmCharacter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Custom prompts
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [newPromptName, setNewPromptName] = useState('');

  useEffect(() => {
    checkUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSettings();
      loadConfigs();
      if (user) {
        loadCustomPrompts();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

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

  async function loadConfigs() {
    try {
      const response = await fetch('/api/ai-configs/list');
      if (response.ok) {
        const data = await response.json();
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
  }

  async function handleSaveConfig(config: AIConfig) {
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
      setMessage('AI Player saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage(`Failed to save AI Player: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async function handleDeleteConfig(id: string) {
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
      setMessage('AI Player deleted successfully!');
    } catch (error) {
      console.error('Error deleting config:', error);
      setMessage('Failed to delete AI Player');
    }
  }

  async function loadSettings() {
    // Load reveal LLM character preference
    const storedRevealLlmCharacter = localStorage.getItem('guesswhoarena_reveal_llm_character');
    if (storedRevealLlmCharacter) {
      setRevealLlmCharacter(storedRevealLlmCharacter === 'true');
    }

    // Load system prompt from localStorage or default
    const storedPrompt = localStorage.getItem('guesswhoarena_system_prompt');
    if (storedPrompt) {
      setSystemPrompt(storedPrompt);
      return;
    }

    // Load default prompt
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

  async function loadCustomPrompts() {
    if (!user) return;

    const { data } = await supabase
      .from('custom_prompts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setCustomPrompts(data);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');

    try {
      // Save to localStorage
      localStorage.setItem('guesswhoarena_system_prompt', systemPrompt);
      localStorage.setItem('guesswhoarena_reveal_llm_character', revealLlmCharacter.toString());

      setMessage('Settings saved successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage('Error saving settings: ' + message);
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomPrompt() {
    if (!user) return;

    if (!newPromptName.trim()) {
      alert('Please enter a name for your custom prompt.');
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_prompts')
        .insert({
          user_id: user.id,
          name: newPromptName,
          prompt_text: systemPrompt
        });

      if (error) throw error;

      setNewPromptName('');
      setMessage('Custom prompt saved!');
      loadCustomPrompts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage('Error saving prompt: ' + message);
    }
  }

  async function loadPrompt(promptId: string) {
    const prompt = customPrompts.find(p => p.id === promptId);
    if (prompt) {
      setSystemPrompt(prompt.prompt_text);
    }
  }

  async function deletePrompt(promptId: string) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('custom_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      setMessage('Prompt deleted');
      loadCustomPrompts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage('Error deleting prompt: ' + message);
    }
  }

  async function loadSimplePrompt() {
    try {
      const response = await fetch('/prompts/simple.txt');
      if (response.ok) {
        const text = await response.text();
        setSystemPrompt(text);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
    }
  }

  async function loadSpelledOutPrompt() {
    try {
      const response = await fetch('/prompts/spelled-out.txt');
      if (response.ok) {
        const text = await response.text();
        setSystemPrompt(text);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
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
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h1 className="text-3xl text-center font-bold mb-4">Settings</h1>

            {/* Info for anonymous users */}
            {!isAuthenticated && (
              <div className="p-4 bg-blue-50 rounded-md text-sm text-blue-800">
                💡 <strong>Tip:</strong> Sign in to save custom prompts and access your game history.
              </div>
            )}

            <CollapsibleSection title="AI Players">
              <AIConfigSelector
                value={null}
                onChange={() => {}}
                label="Manage AI Players"
                isAuthenticated={isAuthenticated}
                savedConfigs={savedConfigs}
                onSaveConfig={handleSaveConfig}
                onDeleteConfig={handleDeleteConfig}
                mode="manage"
              />
            </CollapsibleSection>

            <CollapsibleSection title="Game Settings">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                  <input
                    type="checkbox"
                    id="reveal-llm-character"
                    checked={revealLlmCharacter}
                    onChange={(e) => setRevealLlmCharacter(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="reveal-llm-character" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Reveal LLM&apos;s character during gameplay
                  </label>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="System Prompt">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={loadSimplePrompt}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Load Simple Prompt
                  </button>
                  <button
                    onClick={loadSpelledOutPrompt}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Load Spelled-Out Prompt
                  </button>
                </div>

                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter your system prompt here..."
                />
              </div>

              {/* Save Current Prompt - Only for authenticated users */}
              {isAuthenticated && (
                <>
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-semibold mb-2">Save Current Prompt</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPromptName}
                        onChange={(e) => setNewPromptName(e.target.value)}
                        placeholder="Prompt name..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={saveCustomPrompt}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Save Prompt
                      </button>
                    </div>
                  </div>

                  {/* Custom Prompts List */}
                  {customPrompts.length > 0 && (
                    <div className="pt-4">
                      <h3 className="text-lg font-semibold mb-2">Your Custom Prompts</h3>
                      <div className="space-y-2">
                        {customPrompts.map((prompt) => (
                          <div
                            key={prompt.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                          >
                            <div>
                              <p className="font-medium">{prompt.name}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => loadPrompt(prompt.id)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => deletePrompt(prompt.id)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CollapsibleSection>

            {isAuthenticated && (
              <CollapsibleSection title="Past Games">
                <HistorySection />
              </CollapsibleSection>
            )}

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.includes('Error')
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {message}
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 text-center">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="mx-5 px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              <a href="/"
                className="mx-5 px-6 py-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back to Game
              </a>

            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import CollapsibleSection from '@/components/CollapsibleSection';
import HistorySection from '@/components/HistorySection';

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

  // Settings
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('gpt-5-mini');
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

  async function loadSettings() {
    if (user) {
      // Load from Supabase for authenticated users
      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('api_key, base_url')
        .eq('user_id', user.id)
        .single();

      if (apiKeyData && apiKeyData.api_key) {
        setApiKey(apiKeyData.api_key);
        if (apiKeyData.base_url) setBaseUrl(apiKeyData.base_url);
      }

      // Clear localStorage for logged-in users (they should only use DB)
      localStorage.removeItem('guesswhoarena_api_key');
      localStorage.removeItem('guesswhoarena_base_url');
      localStorage.removeItem('guesswhoarena_model');
      localStorage.removeItem('guesswhoarena_system_prompt');
      localStorage.removeItem('guesswhoarena_reveal_llm_character');
    } else {
      // Load from localStorage for anonymous users
      const storedApiKey = localStorage.getItem('guesswhoarena_api_key');
      const storedBaseUrl = localStorage.getItem('guesswhoarena_base_url');
      const storedModel = localStorage.getItem('guesswhoarena_model');
      const storedPrompt = localStorage.getItem('guesswhoarena_system_prompt');
      const storedRevealLlmCharacter = localStorage.getItem('guesswhoarena_reveal_llm_character');

      if (storedApiKey) setApiKey(storedApiKey);
      if (storedBaseUrl) setBaseUrl(storedBaseUrl);
      if (storedModel) setModel(storedModel);
      if (storedRevealLlmCharacter) setRevealLlmCharacter(storedRevealLlmCharacter === 'true');
      if (storedPrompt) {
        setSystemPrompt(storedPrompt);
        return; // Don't load default if we have a stored one
      }
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
      if (isAuthenticated && user) {
        // Save to Supabase for authenticated users
        // First, check if a record exists
        const { data: existing } = await supabase
          .from('api_keys')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('api_keys')
            .update({
              api_key: apiKey,
              base_url: baseUrl || null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('Supabase error:', error);
            throw error;
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('api_keys')
            .insert({
              user_id: user.id,
              api_key: apiKey,
              base_url: baseUrl || null
            });

          if (error) {
            console.error('Supabase error:', error);
            throw error;
          }
        }

        // Clear localStorage for logged-in users (they should only use DB)
        localStorage.removeItem('guesswhoarena_api_key');
        localStorage.removeItem('guesswhoarena_base_url');
        localStorage.removeItem('guesswhoarena_model');
        localStorage.removeItem('guesswhoarena_system_prompt');
        localStorage.removeItem('guesswhoarena_reveal_llm_character');
      } else {
        // Save to localStorage for anonymous users
        localStorage.setItem('guesswhoarena_api_key', apiKey);
        localStorage.setItem('guesswhoarena_base_url', baseUrl);
        localStorage.setItem('guesswhoarena_model', model);
        localStorage.setItem('guesswhoarena_system_prompt', systemPrompt);
        localStorage.setItem('guesswhoarena_reveal_llm_character', revealLlmCharacter.toString());
      }

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
          prompt_text: systemPrompt,
          model_name: model
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
      if (prompt.model_name) {
        setModel(prompt.model_name);
      }
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

  async function clearApiKey() {
    if (!confirm('Are you sure you want to clear your API key?')) return;

    try {
      if (isAuthenticated && user) {
        // Delete from database for authenticated users
        const { error } = await supabase
          .from('api_keys')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // Clear from localStorage (for both authenticated and anonymous users)
      localStorage.removeItem('guesswhoarena_api_key');
      localStorage.removeItem('guesswhoarena_base_url');

      // Clear state
      setApiKey('');
      setBaseUrl('');
      setMessage('API key cleared successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage('Error clearing API key: ' + message);
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

            <CollapsibleSection title="LLM">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="gpt-4o, gpt-5, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Examples: gpt-5, gpt-5-mini, gpt-4o
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={clearApiKey}
                      disabled={!apiKey}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                      title="Clear API key"
                    >
                      Delete Key
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Check the Help page to learn how this key is handled and make sure you're ok with it.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: leave empty to use the default OpenAI endpoint.
                  </p>
                </div>

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
                              <p className="text-xs text-gray-500">
                                {prompt.model_name || 'No model specified'}
                              </p>
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  const [model, setModel] = useState('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
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
    if (user) {
      loadSettings();
      loadCustomPrompts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        .eq('provider', 'openai')
        .single();

      if (apiKeyData) {
        setApiKey(apiKeyData.api_key);
        if (apiKeyData.base_url) setBaseUrl(apiKeyData.base_url);
      }
    } else {
      // Load from localStorage for anonymous users
      const storedApiKey = localStorage.getItem('openai_api_key');
      const storedBaseUrl = localStorage.getItem('openai_base_url');
      const storedModel = localStorage.getItem('openai_model');
      const storedPrompt = localStorage.getItem('system_prompt');

      if (storedApiKey) setApiKey(storedApiKey);
      if (storedBaseUrl) setBaseUrl(storedBaseUrl);
      if (storedModel) setModel(storedModel);
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
        const { error } = await supabase
          .from('api_keys')
          .upsert({
            user_id: user.id,
            provider: 'openai',
            api_key: apiKey,
            base_url: baseUrl || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,provider'
          });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
      } else {
        // Save to localStorage for anonymous users
        localStorage.setItem('openai_api_key', apiKey);
        localStorage.setItem('openai_base_url', baseUrl);
        localStorage.setItem('openai_model', model);
        localStorage.setItem('system_prompt', systemPrompt);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <button
            onClick={() => router.push('/game')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Game
          </button>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* API Key Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">OpenAI Configuration</h2>
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
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your API key is stored securely and never shared.
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
                  Custom API endpoint URL. Leave empty to use the default OpenAI endpoint.
                </p>
              </div>
            </div>
          </div>

          {/* System Prompt Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">System Prompt</h2>
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
          </div>

          {/* Save Current Prompt - Only for authenticated users */}
          {isAuthenticated && (
            <>
              <div>
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
                <div>
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

          {/* Info for anonymous users */}
          {!isAuthenticated && (
            <div className="p-4 bg-blue-50 rounded-md text-sm text-blue-800">
              💡 <strong>Tip:</strong> Sign in to save custom prompts and access game history across devices.
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
}

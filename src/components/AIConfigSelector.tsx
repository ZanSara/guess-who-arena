'use client';

import { useState, useEffect } from 'react';

export interface AIConfig {
  id: string;
  name: string;
  modelName: string;
  provider: string;
  apiKey?: string; // Only for anonymous users or when creating new
  baseUrl?: string;
  isDefault?: boolean;
}

interface AIConfigSelectorProps {
  value: AIConfig | null;
  onChange: (config: AIConfig | null) => void;
  label?: string;
  isAuthenticated: boolean;
  savedConfigs?: AIConfig[];
  onSaveConfig?: (config: AIConfig) => Promise<void>;
  onDeleteConfig?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  mode?: 'select' | 'settings' | 'manage'; // 'select' for game setup, 'settings' for settings page, 'manage' for managing without selection
}

export default function AIConfigSelector({
  value,
  onChange,
  label = "AI Players",
  isAuthenticated,
  savedConfigs = [],
  onSaveConfig,
  onDeleteConfig,
  onSetDefault,
  mode = 'select'
}: AIConfigSelectorProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formConfig, setFormConfig] = useState<Partial<AIConfig>>({
    name: '',
    modelName: 'gpt-4o',
    provider: 'openai',
    apiKey: '',
    baseUrl: ''
  });

  // Update when value changes externally
  useEffect(() => {
    if (value && value.id) {
      setSelectedId(value.id);
    }
  }, [value]);

  const handleSelectConfig = (id: string) => {
    if (mode === 'manage') {
      // In manage mode, just toggle to show/hide action buttons
      if (id === selectedId) {
        setSelectedId('');
      } else {
        setSelectedId(id);
      }
      return;
    }

    if (id === selectedId) {
      // Deselect
      setSelectedId('');
      onChange(null);
    } else {
      // Select
      setSelectedId(id);
      const config = savedConfigs.find(c => c.id === id);
      if (config) {
        onChange(config);
      }
    }
  };

  const handleUseConfig = () => {
    if (!selectedId) return;

    if (mode === 'settings' && onSetDefault) {
      // Set as default in settings
      onSetDefault(selectedId);
    } else {
      // Use for game setup
      const config = savedConfigs.find(c => c.id === selectedId);
      if (config) {
        onChange(config);
      }
    }
  };

  const handleEditConfig = () => {
    if (!selectedId) return;
    const config = savedConfigs.find(c => c.id === selectedId);
    if (config) {
      setFormConfig({
        name: config.name,
        modelName: config.modelName,
        provider: config.provider,
        apiKey: config.apiKey || '',
        baseUrl: config.baseUrl || ''
      });
      setEditingId(selectedId);
      setShowCreateForm(true);
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedId || !onDeleteConfig) return;

    if (confirm('Delete this configuration?')) {
      await onDeleteConfig(selectedId);
      setSelectedId('');
      onChange(null);
    }
  };

  const handleNewPlayer = () => {
    setFormConfig({
      name: '',
      modelName: 'gpt-4o',
      provider: 'openai',
      apiKey: '',
      baseUrl: ''
    });
    setEditingId(null);
    setShowCreateForm(true);
  };

  const handleSaveConfig = async () => {
    if (!formConfig.name || !formConfig.modelName || !formConfig.apiKey) {
      alert('Please fill in all required fields');
      return;
    }

    const config: AIConfig = {
      id: editingId || '',
      name: formConfig.name,
      modelName: formConfig.modelName,
      provider: formConfig.provider || 'openai',
      apiKey: formConfig.apiKey,
      baseUrl: formConfig.baseUrl || undefined
    };

    if (onSaveConfig) {
      await onSaveConfig(config);
    }

    // Reset form
    setFormConfig({
      name: '',
      modelName: 'gpt-4o',
      provider: 'openai',
      apiKey: '',
      baseUrl: ''
    });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleCancelEdit = () => {
    setFormConfig({
      name: '',
      modelName: 'gpt-4o',
      provider: 'openai',
      apiKey: '',
      baseUrl: ''
    });
    setEditingId(null);
    setShowCreateForm(false);
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{label}</h3>
        <button
          onClick={handleNewPlayer}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-semibold"
        >
          + New Player
        </button>
      </div>

      {!showCreateForm ? (
        <>
          {/* Player List */}
          <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
            {savedConfigs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-2">No AI players configured yet</p>
                <p className="text-sm">Click &quot;+ New Player&quot; to create one</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => handleSelectConfig(config.id)}
                    className={`flex justify-between items-center p-3 transition-colors ${
                      mode === 'manage'
                        ? 'hover:bg-gray-50'
                        : selectedId === config.id
                        ? 'bg-blue-50 border-l-4 border-blue-600 cursor-pointer'
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {config.name}
                        {config.isDefault && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {config.modelName}
                      </div>
                      {config.baseUrl && (
                        <div className="text-xs text-gray-500 mt-1">
                          Custom endpoint
                        </div>
                      )}
                    </div>
                    {(mode === 'manage' || selectedId === config.id) && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(config.id);
                            handleEditConfig();
                          }}
                          className="p-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(config.id);
                            handleDeleteConfig();
                          }}
                          className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Edit/Create Form */
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">
            {editingId ? 'Edit Player' : 'New Player'}
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Player Name *
            </label>
            <input
              type="text"
              value={formConfig.name}
              onChange={(e) => setFormConfig({ ...formConfig, name: e.target.value })}
              placeholder="e.g., My GPT-4"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Name *
            </label>
            <input
              type="text"
              value={formConfig.modelName}
              onChange={(e) => setFormConfig({ ...formConfig, modelName: e.target.value })}
              placeholder="gpt-4o, gpt-4o-mini, claude-3-5-sonnet-20241022, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key *
            </label>
            <input
              type="password"
              value={formConfig.apiKey}
              onChange={(e) => setFormConfig({ ...formConfig, apiKey: e.target.value })}
              placeholder="sk-... or your API key"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL (Optional)
            </label>
            <input
              type="text"
              value={formConfig.baseUrl}
              onChange={(e) => setFormConfig({ ...formConfig, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveConfig}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

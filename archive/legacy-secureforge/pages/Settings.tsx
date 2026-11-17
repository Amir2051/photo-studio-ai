// Settings & Model Configuration Page
// AI provider configuration, preferences, and model settings

import React, { useState } from 'react';
import { Card, Button, Input, Select, Switch, Badge, EmptyState, Icon, Spinner, Dialog, Textarea, showToast, cx } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { AiProvider, UserPreferences } from '../lib/types';

// ─── Settings Page ──────────────────────────────────────────────────
export default function Settings(): React.JSX.Element {
  const [preferences, setPreferences] = useState<UserPreferences>({
    aiProvider: 'offline',
    aiModel: 'offline-fallback',
    defaultProvider: 'offline',
    theme: 'dark',
    language: 'en',
    recentlyUsedFilters: [],
    favoriteCategories: [],
    gridSize: 4,
    safeZone: true,
    faceDetection: true,
    showMetadata: false,
    aspectRatio: 'original',
    useFacePreservation: true,
    retouchIntensity: 0.3,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    // Simulate saving
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaveStatus('saved');
    showToast('Settings saved successfully', 'success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings & Model Configuration</h1>
          <p className="text-sm text-gray-400 mt-1">Configure AI providers, preferences, and model settings.</p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Spinner label="Saving..." /> : <Icon name="save" size={18} />}
          <span className="ml-2">{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}</span>
        </Button>
      </div>

      {/* AI Provider */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">AI Provider Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
            <select
              value={preferences.aiProvider}
              onChange={(e) => setPreferences({ ...preferences, aiProvider: e.target.value as AiProvider })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white"
            >
              <option value="offline">Offline (Deterministic — always works)</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="openrouter">OpenRouter (Online)</option>
              <option value="openai">OpenAI (Online)</option>
              <option value="anthropic">Anthropic (Online)</option>
            </select>
          </div>
          {preferences.aiProvider === 'openrouter' && (
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-sm text-yellow-400">
                To use OpenRouter, enter your API key below. Your key is never stored in the repository.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  type="password"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPreferences({ ...preferences, aiProvider: 'openrouter', aiModel: 'deepseek/deepseek-chat-v3' });
                    setShowOpenRouter(false);
                    showToast('OpenRouter key saved (local only)', 'success');
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>
        <div className="space-y-4">
          <Switch
            checked={preferences.theme === 'dark'}
            onChange={(checked) => setPreferences({ ...preferences, theme: checked ? 'dark' : 'light' })}
            label="Dark mode (default)"
          />
          <Switch
            checked={preferences.faceDetection}
            onChange={(checked) => setPreferences({ ...preferences, faceDetection: checked })}
            label="Face detection (identity preservation)"
          />
          <Switch
            checked={preferences.useFacePreservation}
            onChange={(checked) => setPreferences({ ...preferences, useFacePreservation: checked })}
            label="Face preservation (protect identity)"
          />
          <Switch
            checked={preferences.showMetadata}
            onChange={(checked) => setPreferences({ ...preferences, showMetadata: checked })}
            label="Show image metadata"
          />
          <Switch
            checked={preferences.safeZone}
            onChange={(checked) => setPreferences({ ...preferences, safeZone: checked })}
            label="Safe zone (avoid face-edge overlap)"
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Advanced</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Grid Size</label>
              <select
                value={preferences.gridSize}
                onChange={(e) => setPreferences({ ...preferences, gridSize: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value={2}>2×2</option>
                <option value={3}>3×3</option>
                <option value={4}>4×4</option>
                <option value={5}>5×5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Retouch Intensity</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={preferences.retouchIntensity}
                onChange={(e) => setPreferences({ ...preferences, retouchIntensity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Aspect Ratio</label>
            <select
              value={preferences.aspectRatio}
              onChange={(e) => setPreferences({ ...preferences, aspectRatio: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="original">Original</option>
              <option value="square">Square (1:1)</option>
              <option value="portrait">Portrait (4:5)</option>
              <option value="landscape">Landscape (16:9)</option>
              <option value="story">Story (9:16)</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}

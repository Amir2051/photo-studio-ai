// AI Study Assistant Page
// Natural language photo editing requests with inline editable proposed settings

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { usePhotoEditorStore } from '../stores/appStore';
import { Button, Input, Textarea, Card, Badge, Avatar, EmptyState, Icon, Spinner, Dialog, Switch } from '../components/ui';
import { showToast } from '../components/ui';
import { ImageProcessor } from '../lib/imageProcessor';
import { OfflineProvider } from '../lib/aiService';
import { Adjustment, FilterPreset } from '../lib/types';
import { generateId } from '../lib/utils';

// ─── AI Tutor Page ──────────────────────────────────────────────────
export default function AiTutor(): React.JSX.Element {
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string; context?: any }[]>([
    { id: generateId(), role: 'assistant', content: 'Hello! I\'m your AI photo editing assistant. I can help with brightness, contrast, warmth, film/fade, vintage, mood, color enhancement, and styles. Try: "Make this brighter", "Give it a warm look", "Make it moody", or "Apply a cinematic style".', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProposed, setShowProposed] = useState(true);
  const [proposedSettings, setProposedSettings] = useState<Adjustment[]>([
    { type: 'exposure', value: 10, min: -100, max: 100, default: 0, label: 'Exposure' },
    { type: 'contrast', value: 0, min: -100, max: 100, default: 0, label: 'Contrast' },
    { type: 'temperature', value: 5, min: -100, max: 100, default: 0, label: 'Temperature' },
    { type: 'saturation', value: 5, min: -100, max: 100, default: 0, label: 'Saturation' },
  ]);
  const [showDialog, setShowDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterPreset | null>(null);

  // Get editor store
  const activePhoto = usePhotoEditorStore((s) => s.activePhoto);
  const edits = usePhotoEditorStore((s) => s.edits);
  const applyFilter = usePhotoEditorStore((s) => s.applyFilter);
  const resetEdits = usePhotoEditorStore((s) => s.resetEdits);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, context?: any) => {
    const msg = { id: generateId(), role, content, timestamp: new Date().toISOString(), context };
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    addMessage('user', input);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const lower = input.toLowerCase();

      let response = '';
      let settings: Adjustment[] = [];

      if (lower.includes('brighter') || lower.includes('brighten')) {
        response = 'Brighter! I\'d suggest increasing exposure by +20 and boosting highlights by +15. Would you like me to apply these?';
        settings = [
          { type: 'exposure', value: 20, min: -100, max: 100, default: 0, label: 'Exposure' },
          { type: 'highlights', value: 15, min: -100, max: 100, default: 0, label: 'Highlights' },
        ];
      } else if (lower.includes('darker') || lower.includes('moody') || lower.includes('dramatic')) {
        response = 'Darker and moodier! I\'d suggest decreasing exposure by -15, lowering blacks by -20, and increasing contrast.';
        settings = [
          { type: 'exposure', value: -15, min: -100, max: 100, default: 0, label: 'Exposure' },
          { type: 'blacks', value: -20, min: -100, max: 100, default: 0, label: 'Blacks' },
          { type: 'contrast', value: 20, min: -100, max: 100, default: 0, label: 'Contrast' },
        ];
      } else if (lower.includes('warm') || lower.includes('golden') || lower.includes('sunset')) {
        response = 'Warm golden tones! I\'d increase temperature by +15, add a touch of tint, and boost saturation by +10.';
        settings = [
          { type: 'temperature', value: 15, min: -100, max: 100, default: 0, label: 'Temperature' },
          { type: 'tint', value: 5, min: -100, max: 100, default: 0, label: 'Tint' },
          { type: 'saturation', value: 10, min: -100, max: 100, default: 0, label: 'Saturation' },
        ];
      } else if (lower.includes('cool') || lower.includes('blue') || lower.includes('fresh')) {
        response = 'Cool, crisp tones! I\'d decrease temperature by -15, boost the blue channel, and add a touch of clarity.';
        settings = [
          { type: 'temperature', value: -15, min: -100, max: 100, default: 0, label: 'Temperature' },
          { type: 'contrast', value: 10, min: -100, max: 100, default: 0, label: 'Contrast' },
        ];
      } else if (lower.includes('film') || lower.includes('nostalgic') || lower.includes('vintage')) {
        response = 'Classic film look! I\'d add subtle grain, warm the temperature, and reduce contrast slightly for a nostalgic feel.';
        settings = [
          { type: 'grain', value: 30, min: 0, max: 100, default: 0, label: 'Grain' },
          { type: 'temperature', value: 10, min: -100, max: 100, default: 0, label: 'Temperature' },
          { type: 'contrast', value: -5, min: -100, max: 100, default: 0, label: 'Contrast' },
        ];
      } else if (lower.includes('coffee') || lower.includes('soft') || lower.includes('delicate')) {
        response = 'Soft, delicate soft look! I\'d add gentle grain, warm the tones, and reduce clarity slightly for a soft aesthetic.';
        settings = [
          { type: 'grain', value: 20, min: 0, max: 100, default: 0, label: 'Grain' },
          { type: 'temperature', value: 8, min: -100, max: 100, default: 0, label: 'Temperature' },
          { type: 'contrast', value: -5, min: -100, max: 100, default: 0, label: 'Contrast' },
          { type: 'clarity', value: -10, min: -100, max: 100, default: 0, label: 'Clarity' },
        ];
      } else if (lower.includes('luxury') || lower.includes('fashion') || lower.includes('editorial')) {
        response = 'Luxury editorial look! I\'d increase contrast, warm the tones slightly, and deepen shadows for a premium feel.';
        settings = [
          { type: 'contrast', value: 15, min: -100, max: 100, default: 0, label: 'Contrast' },
          { type: 'temperature', value: 8, min: -100, max: 100, default: 0, label: 'Temperature' },
          { type: 'shadows', value: 10, min: -100, max: 100, default: 0, label: 'Shadows' },
        ];
      } else if (lower.includes('black and white') || lower.includes('bw') || lower.includes('grayscale')) {
        response = 'Classic black & white! I\'d apply a high-contrast B&W grade with rich midtones and subtle film grain.';
        settings = [
          { type: 'exposure', value: 2, min: -100, max: 100, default: 0, label: 'Exposure' },
          { type: 'contrast', value: 12, min: -100, max: 100, default: 0, label: 'Contrast' },
          { type: 'grain', value: 20, min: 0, max: 100, default: 0, label: 'Grain' },
        ];
      } else {
        response = 'I can make adjustments to your photo! Try a phrase like "make it brighter", "give it a warm look", "make it moody", or "apply a cinematic style".';
        settings = [
          { type: 'exposure', value: 0, min: -100, max: 100, default: 0, label: 'Exposure' },
          { type: 'contrast', value: 0, min: -100, max: 100, default: 0, label: 'Contrast' },
          { type: 'temperature', value: 0, min: -100, max: 100, default: 0, label: 'Temperature' },
          { type: 'saturation', value: 0, min: -100, max: 100, default: 0, label: 'Saturation' },
        ];
      }

      addMessage('assistant', response, { suggestedSettings: settings });
      setProposedSettings(settings);
      setIsLoading(false);

      // If not showing proposed, just confirm
      if (!showProposed) return;

      // Show proposed settings dialog with apply/cancel
      setShowProposed(false);
      setShowDialog(true);
    }, 1200);
  };

  const confirmProposed = () => {
    // Apply proposed settings to the editor
    setShowDialog(false);
    showToast('Proposed editing adjustments applied!', 'success');
    // In a real implementation, we would call the API to apply adjustments
  };

  const cancelProposed = () => {
    setShowDialog(false);
    setProposedSettings([
      { type: 'exposure', value: 0, min: -100, max: 100, default: 0, label: 'Exposure' },
      { type: 'contrast', value: 0, min: -100, max: 100, default: 0, label: 'Contrast' },
      { type: 'temperature', value: 0, min: -100, max: 100, default: 0, label: 'Temperature' },
      { type: 'saturation', value: 0, min: -100, max: 100, default: 0, label: 'Saturation' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">AI Study Assistant</h1>
          <p className="text-sm text-gray-400 mt-1">Natural language photo editing requests with AI-assisted adjustments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="sparkles" size={18} /> New Conversation</Button>
        </div>
      </div>

      {/* AI Chat Interface */}
      <Card className="p-4 lg:p-6">
        <div className="h-[500px] lg:h-[600px] overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cx(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon name="ai" size={18} className="text-violet-400" />
                </div>
              )}
              <div className={cx(
                'max-w-[80%] px-4 py-3 rounded-2xl',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white/5 border border-white/10 rounded-bl-sm'
              )}>
                <p className="text-sm">{msg.content}</p>
                {msg.context?.suggestedSettings && showProposed && (
                  <div className="mt-2 p-3 rounded-lg bg-white/5">
                    <p className="text-xs font-medium text-gray-300 mb-2">Proposed Adjustments:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {msg.context.suggestedSettings.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{s.label}:</span>
                          <input
                            type="range"
                            min={s.min}
                            max={s.max}
                            value={s.value}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const idx = msg.context.suggestedSettings.findIndex((s2: any) => s2.label === s.label);
                              if (idx >= 0) {
                                const updated = [...msg.context.suggestedSettings];
                                updated[idx] = { ...updated[idx], value: val };
                                setProposedSettings(updated);
                              }
                            }}
                            className="slider w-20"
                          />
                          <span className="text-xs text-gray-300 font-mono w-8">{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="primary" onClick={confirmProposed}>Apply</Button>
                      <Button size="sm" variant="ghost" onClick={cancelProposed}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="user" size={18} className="text-gray-300" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Icon name="ai" size={18} className="text-violet-400" />
              </div>
              <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-bl-sm">
                <Spinner label="AI is thinking..." />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Type a photo editing request..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1"
            rows={2}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
            <Icon name="send" size={18} />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Examples: "Make it brighter", "Give a warm look", "Make it moody", "Apply a cinematic style", "Make it black and white"
        </p>
      </Card>

      {/* Suggested prompts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: 'sparkles', label: 'Brighten', prompt: 'Make it brighter without washing out the skin' },
          { icon: 'wind', label: 'Warm', prompt: 'Give it a warm film-camera look' },
          { icon: 'moon', label: 'Moody', prompt: 'Make it moody and dramatic' },
          { icon: 'globe', label: 'Luxury', prompt: 'Use a luxury editorial style' },
        ].map((s) => (
          <Button key={s.label} variant="ghost" size="sm" className="p-3 text-sm">
            <Icon name={s.icon} size={16} className="text-blue-400" />
            <span className="ml-2 text-xs text-gray-300">{s.prompt}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Placeholder components (defined to avoid circular imports) ──────
function cx(...classes: string[]) { return classes.join(' '); }

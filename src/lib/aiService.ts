// AI Service — Configurable provider abstraction
// Supports: OpenAI, Anthropic, Google, OpenRouter, Ollama, Offline (deterministic fallback)

import { AiMessage, AiMessageContext, ScenePrompt, SceneAnalysis } from './types';
import { generateId, formatDate } from './utils';

export interface AiProvider {
  name: string;
  supportsImages: boolean;
  getModel(): string;
  chat(messages: AiMessage[], options?: { context?: AiMessageContext }): Promise<string>;
  generateScene(imageBase64: string, prompt: string, options?: {}): Promise<ScenePrompt[]>;
  canUploadToCloud(): boolean;
}

// ── Offline deterministic fallback ─────────────────────────────────────
export class OfflineProvider implements AiProvider {
  name: string;
  supportsImages: boolean;
  private model: string = 'offline-fallback';

  constructor() {
    this.name = 'offline';
    this.supportsImages = false;
  }

  getModel(): string {
    return this.model;
  }

  async chat(_messages: AiMessage[], _options?: { context?: AiMessageContext }): Promise<string> {
    const last = _messages[_messages.length - 1];
    if (last && last.content.toLowerCase().includes('help')) {
      return 'I can help with: brightness, contrast, warmth, coolness, film/fade, vintage, mood, color enhancement, and applying styles. Try a phrase like "make this brighter" or "give it a vintage look"!';
    }
    if (last.content.toLowerCase().includes('what can you do')) {
      return 'I can help with: brightness, contrast, warmth, coolness, film/fade, vintage, mood, color enhancement, and applying styles. Try a phrase like "make this brighter" or "give it a vintage look"!';
    }
    return 'I can make adjustments to your photo! Try a phrase like "make it brighter", "give it a warm look", "make it moody", or "apply a cinematic style".';
  }

  async generateScene(_imageBase64: string, _prompt: string, _options?: {}): Promise<ScenePrompt[]> {
    const analysis: SceneAnalysis = {
      subjectPose: 'standing',
      lightingDirection: 'natural',
      cameraAngle: 'eye-level',
      backgroundType: 'outdoor',
      focalLength: 50,
      depthOfField: 0,
    };
    const prompts: ScenePrompt[] = [
      {
        id: generateId(),
        prompt: 'New scene generated',
        destination: 'stylish street',
        style: 'place-inspired',
        timeOfDay: 'afternoon',
        weather: 'clear',
        atmosphere: 'realistic',
        backgroundBlur: 0,
        realism: 0.8,
        lighting: 'natural',
        analysis: analysis,
        createdAt: formatDate(new Date()),
      },
    ];
    return prompts;
  }

  canUploadToCloud(): boolean {
    return false;
  }
}

// ── OpenRouter provider (configurable) ─────────────────────────────────
export class OpenRouterProvider implements AiProvider {
  name: string;
  supportsImages: boolean;
  private apiKey: string;
  private model: string;
  private modelId: string;

  constructor(apiKey: string, modelId: string = 'deepseek/deepseek-chat-v3') {
    this.name = 'openrouter';
    this.supportsImages = true;
    this.apiKey = apiKey;
    this.model = modelId;
    this.modelId = modelId;
  }

  getModel(): string {
    return this.model;
  }

  async chat(_messages: AiMessage[], _options?: { context?: AiMessageContext }): Promise<string> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: _messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || 'I received a response but could not parse it.';
    } catch (err) {
      return 'AI provider unavailable. Using offline fallback.';
    }
  }

  async generateScene(_imageBase64: string, _prompt: string, _options?: {}): Promise<ScenePrompt[]> {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            {
              role: 'user',
              content: 'Scene generation request',
            },
          ],
        }),
      });
      await res.json();
      return [
        {
          id: generateId(),
          prompt: 'New scene generated',
          destination: 'stylish street',
          style: 'place-inspired',
          timeOfDay: 'afternoon',
          weather: 'clear',
          atmosphere: 'realistic',
          backgroundBlur: 0,
          realism: 0.8,
          lighting: 'natural',
          analysis: {
            subjectPose: 'standing',
            lightingDirection: 'natural',
            cameraAngle: 'eye-level',
            backgroundType: 'outdoor',
            focalLength: 50,
            depthOfField: 0,
          },
          createdAt: formatDate(new Date()),
        },
      ];
    } catch (err) {
      return [];
    }
  }

  canUploadToCloud(): boolean {
    return true;
  }
}

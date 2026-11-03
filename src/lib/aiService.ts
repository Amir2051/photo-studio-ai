import type { AiMessage, AiMessageContext, ScenePrompt } from './types';

export interface AiProvider {
  name: string;
  supportsImages: boolean;
  getModel(): string;
  chat(messages: AiMessage[], options?: { context?: AiMessageContext }): Promise<string>;
  generateScene(
    imageBase64: string,
    prompt: string,
    options?: Record<string, unknown>,
  ): Promise<ScenePrompt[]>;
  canUploadToCloud(): boolean;
}

/** Local guidance only. It never claims to generate or analyze images. */
export class OfflineProvider implements AiProvider {
  name = 'offline';
  supportsImages = false;
  getModel(): string {
    return 'local-guidance';
  }
  async chat(messages: AiMessage[]): Promise<string> {
    const text = messages.at(-1)?.content.toLowerCase() ?? '';
    if (/scene|background|place me|landmark/.test(text)) {
      return 'Scene generation is not configured yet. Your source image has not been uploaded or changed.';
    }
    return 'I can offer simple local editing guidance. Try asking for a warmer, brighter, more contrast-rich, or more muted look. A connected AI model is not configured.';
  }
  async generateScene(): Promise<ScenePrompt[]> {
    throw new Error(
      'Scene generation is unavailable: configure a secure server-side image-generation service first. No placeholder result was created.',
    );
  }
  canUploadToCloud(): boolean {
    return false;
  }
}

/**
 * Browser adapter for a server-side AI gateway. API keys must remain on the
 * server; this client deliberately ignores legacy browser-supplied API keys.
 */
export class OpenRouterProvider implements AiProvider {
  name = 'server-ai';
  supportsImages = false;
  private modelId: string;
  private endpoint: string;
  private accessTokenProvider?: () => Promise<string | null>;
  constructor(
    _legacyApiKey?: string,
    modelId = 'configured-server-model',
    accessTokenProvider?: () => Promise<string | null>,
  ) {
    this.modelId = modelId;
    this.accessTokenProvider = accessTokenProvider;
    this.endpoint = (import.meta.env.VITE_AI_API_BASE_URL || '/api/ai').replace(/\/$/, '');
  }

  private async authorizationHeaders(): Promise<Record<string, string>> {
    const token = await this.accessTokenProvider?.();
    if (!token) throw new Error('Sign in is required before using cloud AI.');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }
  getModel(): string {
    return this.modelId;
  }
  canUploadToCloud(): boolean {
    return false;
  }

  async chat(messages: AiMessage[]): Promise<string> {
    const response = await fetch(this.endpoint + '/chat', {
      method: 'POST',
      headers: await this.authorizationHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({
        model: this.modelId,
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!response.ok)
      throw new Error(
        'AI service request failed (' +
          response.status +
          '). Check the server-side AI gateway configuration.',
      );
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? data?.content;
    if (typeof content !== 'string' || !content.trim())
      throw new Error('AI service returned no usable text.');
    return content;
  }

  async generateScene(
    imageBase64: string,
    prompt: string,
    options: Record<string, unknown> = {},
  ): Promise<ScenePrompt[]> {
    if (!imageBase64 || !prompt.trim())
      throw new Error('A source image and scene description are required.');
    const response = await fetch(this.endpoint + '/scene', {
      method: 'POST',
      headers: await this.authorizationHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({ image: imageBase64, prompt, options }),
    });
    if (!response.ok)
      throw new Error(
        'Scene generation failed (' + response.status + '). No generated result was saved.',
      );
    const data = await response.json();
    if (!Array.isArray(data?.scenes))
      throw new Error('Scene service returned an invalid response.');
    return data.scenes as ScenePrompt[];
  }
}

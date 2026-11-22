import { createSupabaseAiProvider } from './aiService';
import { getSupabaseAccessToken } from './supabase';

/**
 * Shared authenticated adapter for future cloud-AI UI components.
 * Obtains the current Supabase access token for each request; no API key is
 * included in browser code. The active editor remains local-only until a
 * connected AI workflow is deliberately enabled.
 */
export const supabaseAiProvider = createSupabaseAiProvider(getSupabaseAccessToken);

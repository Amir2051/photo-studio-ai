import { createFirebaseAiProvider } from './aiService';
import { getCurrentFirebaseIdToken } from './firebase';

/**
 * Shared authenticated adapter for future cloud-AI UI components.
 * It obtains the current Firebase ID token for each request; no API key is
 * included in browser code. The active editor remains local-only until a
 * connected AI workflow is deliberately enabled.
 */
export const firebaseAiProvider = createFirebaseAiProvider(getCurrentFirebaseIdToken);

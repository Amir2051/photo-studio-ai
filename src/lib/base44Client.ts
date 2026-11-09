import { createClient } from '@base44/sdk';

const appId = import.meta.env.VITE_BASE44_APP_ID || '6af1278c70575d12521047be';

export const base44Client = createClient({
  appId,
  options: {
    onError: (error) => {
      console.error('[Base44] Request failed:', error.message);
    },
  },
});

// Supabase client for Minu Studio (project texgwxmizyxsdzcfsjpo).
// The publishable/anon key is public by design; Row Level Security on the
// Minu Studio tables is what actually protects the data.
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://texgwxmizyxsdzcfsjpo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fBFeavpYj1CI4L-lTAVj2Q_V41qHK2Z';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

/** Returns a fresh Supabase access token for the currently signed-in user. */
export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Returns the current signed-in Supabase user, or null. */
export async function getSupabaseUser(): Promise<{ id: string; email: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user
    ? { id: data.session.user.id, email: data.session.user.email ?? null }
    : null;
}

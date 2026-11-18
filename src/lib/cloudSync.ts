// Style Recipe cloud sync for Minu Studio — Supabase (PostgREST + RLS).
// Replaces the previous Base44 studio-sync function: recipes sync to the
// style_recipes_sync table, where row level security restricts every row to
// the owner's Supabase auth uid. No foreign backend is required.
import type { StyleRecipe } from './types';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, getSupabaseAccessToken, getSupabaseUser } from './supabase';
import { getStyleRecipes, saveStyleRecipe } from './storage';

export type StyleRecipeSyncResult = {
  uploaded: number;
  downloaded: number;
  total: number;
};

type RemoteRecipe = {
  local_recipe_id?: string;
  recipe_json?: string;
  recipe_name?: string;
  updated_at_local?: string;
};

function isStyleRecipe(value: unknown): value is StyleRecipe {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<StyleRecipe>;
  return (
    typeof recipe.id === 'string' &&
    typeof recipe.name === 'string' &&
    typeof recipe.createdAt === 'string' &&
    typeof recipe.adjustments === 'object' &&
    recipe.adjustments !== null
  );
}

const ENDPOINT = `${SUPABASE_URL}/rest/v1/style_recipes_sync`;

async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error('Sign in to your studio account before syncing.');
  return fetch(ENDPOINT + path, {
    ...init,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

export async function syncStyleRecipesToCloud(): Promise<StyleRecipeSyncResult> {
  const user = await getSupabaseUser();
  if (!user) throw new Error('Sign in to your studio account before syncing.');

  const localRecipes = await getStyleRecipes();
  const rows = localRecipes.map((recipe) => ({
    owner_uid: user.id,
    local_recipe_id: recipe.id,
    recipe_name: recipe.name,
    category: 'custom',
    description: 'Saved in Minu Studio',
    recipe_json: JSON.stringify(recipe),
    updated_at_local: recipe.createdAt,
  }));

  if (rows.length) {
    const upsert = await authedFetch('?on_conflict=owner_uid,local_recipe_id', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });
    if (!upsert.ok) {
      throw new Error(`Recipe sync failed (${upsert.status}). Check your connection and try again.`);
    }
  }

  const listResponse = await authedFetch('?select=*&order=updated_at_local.desc', {
    method: 'GET',
  });
  if (!listResponse.ok) {
    throw new Error(`Recipe sync failed (${listResponse.status}). Check your connection and try again.`);
  }
  const remotes = (await listResponse.json()) as RemoteRecipe[];

  const localIds = new Set(localRecipes.map((recipe) => recipe.id));
  let downloaded = 0;
  for (const remote of remotes) {
    if (!remote.local_recipe_id || localIds.has(remote.local_recipe_id)) continue;
    if (!remote.recipe_json) continue;
    try {
      const parsed: unknown = JSON.parse(remote.recipe_json);
      if (!isStyleRecipe(parsed) || parsed.id !== remote.local_recipe_id) continue;
      await saveStyleRecipe(parsed);
      localIds.add(parsed.id);
      downloaded += 1;
    } catch {
      // Ignore malformed remote records; one bad recipe must not stop the rest.
    }
  }

  return {
    uploaded: localRecipes.length,
    downloaded,
    total: localIds.size,
  };
}

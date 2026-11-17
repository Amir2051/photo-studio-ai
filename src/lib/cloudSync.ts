import type { StyleRecipe } from './types';
import { base44Client } from './base44Client';
import { getCurrentFirebaseIdToken } from './firebase';
import { getStyleRecipes, saveStyleRecipe } from './storage';

type RemoteRecipe = {
  local_recipe_id?: string;
  recipe_json?: string;
  recipe_name?: string;
  updated_at_local?: string;
};

export type StyleRecipeSyncResult = {
  uploaded: number;
  downloaded: number;
  total: number;
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

export async function syncStyleRecipesToCloud(): Promise<StyleRecipeSyncResult> {
  const firebaseIdToken = await getCurrentFirebaseIdToken();
  if (!firebaseIdToken) throw new Error('Sign in to your studio account before syncing.');

  const localRecipes = await getStyleRecipes();
  for (const recipe of localRecipes) {
    await base44Client.functions.invoke('studio-sync', {
      action: 'upsertRecipe',
      firebaseIdToken,
      recipe: {
        local_recipe_id: recipe.id,
        recipe_name: recipe.name,
        category: 'custom',
        description: 'Saved in Every Frame First Studio',
        recipe_json: JSON.stringify(recipe),
        updated_at_local: recipe.createdAt,
      },
    });
  }

  const result = (await base44Client.functions.invoke('studio-sync', {
    action: 'listRecipes',
    firebaseIdToken,
  })) as { recipes?: RemoteRecipe[] };

  const localIds = new Set(localRecipes.map((recipe) => recipe.id));
  let downloaded = 0;
  for (const remote of result.recipes || []) {
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

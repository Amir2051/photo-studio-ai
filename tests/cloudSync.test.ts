import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getUser: vi.fn(),
  getToken: vi.fn(),
  getRecipes: vi.fn(),
  saveRecipe: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  getSupabaseAccessToken: mocks.getToken,
  getSupabaseUser: mocks.getUser,
}));
vi.mock('../src/lib/storage', () => ({
  getStyleRecipes: mocks.getRecipes,
  saveStyleRecipe: mocks.saveRecipe,
}));

import { syncStyleRecipesToCloud } from '../src/lib/cloudSync';

const localRecipe = {
  id: 'local-recipe-1',
  name: 'Warm Portrait',
  createdAt: '2026-11-08T10:00:00.000Z',
  adjustments: { brightness: 102, contrast: 105, saturation: 96, warmth: 8 },
  filterIntensity: 80,
  selectedFilterId: 'portrait-soft',
  retouchStrength: 20,
  retouchEnabled: false,
};

const remoteRecipe = {
  ...localRecipe,
  id: 'remote-recipe-2',
  name: 'Night Film',
  createdAt: '2026-11-07T10:00:00.000Z',
};

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 201 });
}

describe('private cloud recipe sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.getToken.mockResolvedValue('access-token');
    mocks.getUser.mockResolvedValue({ id: 'user-123', email: 'studio@example.com' });
    mocks.getRecipes.mockResolvedValue([localRecipe]);
    mocks.saveRecipe.mockResolvedValue(undefined);
    mocks.fetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        return okJson([]);
      }
      // listRecipes
      return okJson([
        { local_recipe_id: localRecipe.id, recipe_json: JSON.stringify(localRecipe) },
        { local_recipe_id: remoteRecipe.id, recipe_json: JSON.stringify(remoteRecipe) },
      ]);
    });
  });

  it('uploads local recipes and downloads remote-only recipes', async () => {
    const result = await syncStyleRecipesToCloud();

    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    const [upsertUrl, upsertInit] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(upsertUrl).toContain('/rest/v1/style_recipes_sync?on_conflict=owner_uid,local_recipe_id');
    expect(upsertInit?.method).toBe('POST');
    expect(String(upsertInit?.body)).toContain('local-recipe-1');
    expect(mocks.saveRecipe).toHaveBeenCalledWith(remoteRecipe);
    expect(result).toEqual({ uploaded: 1, downloaded: 1, total: 2 });
  });

  it('fails closed when there is no Supabase session', async () => {
    mocks.getToken.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue(null);

    await expect(syncStyleRecipesToCloud()).rejects.toThrow(
      'Sign in to your studio account before syncing.',
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('ignores malformed remote recipes without failing the sync', async () => {
    mocks.fetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return okJson([]);
      }
      return okJson([{ local_recipe_id: 'broken', recipe_json: '{' }]);
    });

    const result = await syncStyleRecipesToCloud();
    expect(result).toEqual({ uploaded: 1, downloaded: 0, total: 1 });
    expect(mocks.saveRecipe).not.toHaveBeenCalled();
  });
});

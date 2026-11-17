import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  getToken: vi.fn(),
  getRecipes: vi.fn(),
  saveRecipe: vi.fn(),
}));

vi.mock('../src/lib/base44Client', () => ({
  base44Client: { functions: { invoke: mocks.invoke } },
}));
vi.mock('../src/lib/firebase', () => ({
  getCurrentFirebaseIdToken: mocks.getToken,
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

describe('private cloud recipe sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getToken.mockResolvedValue('firebase-id-token');
    mocks.getRecipes.mockResolvedValue([localRecipe]);
    mocks.saveRecipe.mockResolvedValue(undefined);
    mocks.invoke.mockImplementation((_name: string, data: { action: string }) => {
      if (data.action === 'listRecipes') {
        return Promise.resolve({
          recipes: [
            { local_recipe_id: localRecipe.id, recipe_json: JSON.stringify(localRecipe) },
            { local_recipe_id: remoteRecipe.id, recipe_json: JSON.stringify(remoteRecipe) },
          ],
        });
      }
      return Promise.resolve({ success: true });
    });
  });

  it('uploads local recipes and downloads remote-only recipes', async () => {
    const result = await syncStyleRecipesToCloud();

    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.invoke.mock.calls[0][1]).toMatchObject({
      action: 'upsertRecipe',
      firebaseIdToken: 'firebase-id-token',
      recipe: { local_recipe_id: localRecipe.id, recipe_name: localRecipe.name },
    });
    expect(mocks.saveRecipe).toHaveBeenCalledWith(remoteRecipe);
    expect(result).toEqual({ uploaded: 1, downloaded: 1, total: 2 });
  });

  it('fails closed when there is no Firebase session', async () => {
    mocks.getToken.mockResolvedValue(null);

    await expect(syncStyleRecipesToCloud()).rejects.toThrow(
      'Sign in to your studio account before syncing.',
    );
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('ignores malformed remote recipes without failing the sync', async () => {
    mocks.invoke.mockImplementation((_name: string, data: { action: string }) =>
      data.action === 'listRecipes'
        ? Promise.resolve({ recipes: [{ local_recipe_id: 'broken', recipe_json: '{' }] })
        : Promise.resolve({ success: true }),
    );

    const result = await syncStyleRecipesToCloud();
    expect(result).toEqual({ uploaded: 1, downloaded: 0, total: 1 });
    expect(mocks.saveRecipe).not.toHaveBeenCalled();
  });
});

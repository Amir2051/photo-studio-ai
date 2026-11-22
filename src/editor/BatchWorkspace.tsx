import React from 'react';
import type { StyleRecipe } from '../lib/types';
import { deleteStyleRecipe, getStyleRecipes } from '../lib/storage';

export type BatchExportFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface BatchPhotoItem {
  id: string;
  file: File;
  image: HTMLImageElement;
  originalPreview: string;
  previewUrl?: string;
  status?: 'ready' | 'done' | 'error';
  error?: string;
}

export interface BatchWorkspaceProps {
  styleRecipes: StyleRecipe[];
  styleRecipeName: string;
  setStyleRecipeName: React.Dispatch<React.SetStateAction<string>>;
  hasImage: boolean;
  batchBusy: boolean;
  saveCurrentStyle: (nameOverride?: string) => Promise<void>;
  selectedStyleRecipeId: string;
  setSelectedStyleRecipeId: React.Dispatch<React.SetStateAction<string>>;
  setAdHocBatchRecipe: React.Dispatch<React.SetStateAction<StyleRecipe | null>>;
  clearBatchPreviews: () => void;
  setStyleRecipes: React.Dispatch<React.SetStateAction<StyleRecipe[]>>;
  batchFileInputRef: React.RefObject<HTMLInputElement | null>;
  syncCurrentEditsToBatch: () => void;
  loadStyleOnReference: () => void;
  selectedBatchRecipe: StyleRecipe | null;
  adHocBatchRecipe: StyleRecipe | null;
  batchItems: BatchPhotoItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchPhotoItem[]>>;
  removeBatchPhoto: (id: string) => void;
  previewBatch: () => Promise<void>;
  exportBatch: () => Promise<void>;
  batchFormat: BatchExportFormat;
  setBatchFormat: React.Dispatch<React.SetStateAction<BatchExportFormat>>;
  batchProgress: { current: number; total: number } | null;
  batchCancelRef: React.MutableRefObject<boolean>;
}

export default function BatchWorkspace(props: BatchWorkspaceProps): React.JSX.Element {
  const {
    styleRecipes,
    styleRecipeName,
    setStyleRecipeName,
    hasImage,
    batchBusy,
    saveCurrentStyle,
    selectedStyleRecipeId,
    setSelectedStyleRecipeId,
    setAdHocBatchRecipe,
    clearBatchPreviews,
    setStyleRecipes,
    batchFileInputRef,
    syncCurrentEditsToBatch,
    loadStyleOnReference,
    selectedBatchRecipe,
    adHocBatchRecipe,
    batchItems,
    setBatchItems,
    removeBatchPhoto,
    previewBatch,
    exportBatch,
    batchFormat,
    setBatchFormat,
    batchProgress,
    batchCancelRef,
  } = props;

  return (
    <section className="tool-panel style-workflow-panel" id="assets-workspace" data-panel="batch">
      <div className="section-title">
        <div>
          <p className="eyebrow">REFERENCE → REPEAT</p>
          <h2>Style Recipes</h2>
        </div>
        <span>{styleRecipes.length} saved</span>
      </div>
      <p className="tool-note">
        Finish editing this reference photo, save its settings, then apply the same look
        to a group of photos.
      </p>
      <input
        className="filter-search"
        value={styleRecipeName}
        onChange={(e) => setStyleRecipeName(e.target.value)}
        placeholder="Name this style (e.g. Warm Studio)"
        disabled={!hasImage}
      />
      <button
        className="button button-primary style-save-button"
        onClick={() => void saveCurrentStyle()}
        disabled={!hasImage || batchBusy}
      >
        Save current edits as Style Recipe
      </button>
      <div className="style-recipe-row">
        <select
          className="filter-category-select"
          value={selectedStyleRecipeId}
          onChange={(e) => {
            setSelectedStyleRecipeId(e.target.value);
            setAdHocBatchRecipe(null);
            clearBatchPreviews();
          }}
        >
          <option value="">Choose a saved recipe</option>
          {styleRecipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name}
            </option>
          ))}
        </select>
        <button
          className="text-button"
          disabled={!selectedStyleRecipeId}
          onClick={() => {
            const recipe = styleRecipes.find((item) => item.id === selectedStyleRecipeId);
            if (recipe && window.confirm(`Delete “${recipe.name}”?`))
              void deleteStyleRecipe(recipe.id).then(() =>
                getStyleRecipes().then(setStyleRecipes),
              );
          }}
        >
          Delete
        </button>
      </div>
      <div className="batch-actions">
        <button
          className="button button-quiet"
          onClick={() => batchFileInputRef.current?.click()}
          disabled={batchBusy}
        >
          Add batch photos
        </button>
        <button
          className="button button-quiet"
          onClick={syncCurrentEditsToBatch}
          disabled={!hasImage || batchBusy}
          title="Use the edits currently on the reference photo as the batch recipe"
        >
          Sync current edits to batch
        </button>
        <button
          className="button button-quiet"
          onClick={loadStyleOnReference}
          disabled={!hasImage || !selectedStyleRecipeId}
        >
          Load onto reference
        </button>
      </div>
      <p className="tool-note">
        Batch source: {selectedBatchRecipe?.name ?? 'none chosen — pick a recipe or sync current edits'}
        {adHocBatchRecipe && (
          <>
            {' '}
            <button className="text-button" onClick={() => setAdHocBatchRecipe(null)}>
              Clear sync
            </button>
          </>
        )}
      </p>
      {batchItems.length > 0 && (
        <>
          <div className="batch-summary">
            <strong>{batchItems.length} photo(s) queued</strong>
            <button
              className="text-button"
              onClick={() => {
                for (const item of batchItems)
                  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                setBatchItems([]);
              }}
            >
              Clear batch
            </button>
          </div>
          <div className="batch-photo-grid">
            {batchItems.map((item) => (
              <div
                className={`batch-photo-card ${item.status === 'error' ? 'batch-photo-error' : ''}`}
                key={item.id}
              >
                <img src={item.previewUrl || item.originalPreview} alt={item.file.name} />
                <span title={item.file.name}>{item.file.name}</span>
                {item.status === 'error' && (
                  <span className="batch-error-note" title={item.error || 'Failed'}>
                    Failed
                  </span>
                )}
                {item.status === 'done' && <span className="batch-done-note">Done</span>}
                <button
                  className="batch-remove"
                  onClick={() => removeBatchPhoto(item.id)}
                  aria-label={`Remove ${item.file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="batch-actions">
            <button
              className="button button-quiet"
              onClick={() => void previewBatch()}
              disabled={batchBusy || !selectedBatchRecipe}
            >
              {batchBusy ? 'Working…' : 'Preview on all'}
            </button>
          </div>
          <label className="format-select batch-format-select">
            Export format{' '}
            <select
              value={batchFormat}
              onChange={(e) => setBatchFormat(e.target.value as BatchExportFormat)}
            >
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WebP</option>
            </select>
          </label>
          <button
            className="button button-primary style-save-button"
            onClick={() => void exportBatch()}
            disabled={batchBusy || !selectedBatchRecipe}
          >
            {batchBusy
              ? `Processing ${batchProgress?.current ?? 0}/${batchProgress?.total ?? batchItems.length}…`
              : `Export ${batchItems.length} edited photos (.zip)`}
          </button>
          {batchBusy && (
            <button
              className="button button-quiet"
              onClick={() => {
                batchCancelRef.current = true;
              }}
            >
              Cancel batch
            </button>
          )}
        </>
      )}
      <p className="tool-note">
        Recipes store global tone settings and retouch strength locally. Face smoothing is
        detected separately on each target photo; hand-painted brush marks are specific to
        the reference and are not copied.
      </p>
    </section>
  );
}

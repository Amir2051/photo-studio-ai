import React from 'react';
import { Check, Plus, Star } from 'lucide-react';
import FilterThumbnail from '../components/FilterThumbnail';
import type { FilterRecipe } from '../lib/types';
import { CATEGORIES, FILTER_LIBRARY } from '../lib/filters';

type Adjustments = { brightness: number; contrast: number; saturation: number; warmth: number };
export interface Preset {
  id: string;
  name: string;
  values: Adjustments;
}

export interface EffectsPanelProps {
  hasImage: boolean;
  sourceUrl: string | null;
  // Filter library panel
  filterQuery: string;
  setFilterQuery: React.Dispatch<React.SetStateAction<string>>;
  filterCategory: string;
  setFilterCategory: React.Dispatch<React.SetStateAction<string>>;
  favoriteFilterIds: string[];
  visibleFilters: FilterRecipe[];
  filterVisibleCount: number;
  setFilterVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  selectedFilterId: string;
  filterIntensity: number;
  applyLibraryFilter: (recipe: FilterRecipe, intensity?: number) => void;
  toggleFavoriteFilter: (filterId: string) => void;
  // Quick looks panel
  presets: Preset[];
  activePreset: string;
  applyPreset: (preset: Preset) => void;
}

export default function EffectsPanel({
  hasImage,
  sourceUrl,
  filterQuery,
  setFilterQuery,
  filterCategory,
  setFilterCategory,
  favoriteFilterIds,
  visibleFilters,
  filterVisibleCount,
  setFilterVisibleCount,
  selectedFilterId,
  filterIntensity,
  applyLibraryFilter,
  toggleFavoriteFilter,
  presets,
  activePreset,
  applyPreset,
}: EffectsPanelProps): React.JSX.Element {
  return (
    <>
      <section className="tool-panel filter-library-panel" id="effects-workspace" data-panel="effects">
        <div className="section-title">
          <div>
            <p className="eyebrow">FILTER LIBRARY</p>
            <h2>Explore looks</h2>
          </div>
          <span>{FILTER_LIBRARY.length} looks</span>
        </div>
        <input
          className="filter-search"
          type="search"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Search portraits, film, cinematic…"
        />
        <select
          className="filter-category-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          <option value="favorites">Favorites ({favoriteFilterIds.length})</option>
          {CATEGORIES.filter((category) => category.id !== 'custom').map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <div className="filter-list">
          {visibleFilters.slice(0, filterVisibleCount).map((filter) => (
            <article className="filter-card" key={filter.id}>
              <button
                className={`filter-option ${selectedFilterId === filter.id ? 'selected' : ''}`}
                onClick={() => applyLibraryFilter(filter)}
                disabled={!hasImage}
                aria-pressed={selectedFilterId === filter.id}
              >
                <FilterThumbnail sourceUrl={sourceUrl} recipe={filter} />
                <span className="filter-option-copy">
                  <strong>{filter.name}</strong>
                  <small>{filter.description}</small>
                </span>
                <span className="filter-apply-mark">
                  {selectedFilterId === filter.id ? (
                    <Check size={12} aria-hidden="true" />
                  ) : (
                    <Plus size={12} aria-hidden="true" />
                  )}
                </span>
              </button>
              <button
                type="button"
                className={`filter-favorite ${favoriteFilterIds.includes(filter.id) ? 'is-favorite' : ''}`}
                onClick={() => toggleFavoriteFilter(filter.id)}
                aria-label={`${favoriteFilterIds.includes(filter.id) ? 'Remove' : 'Add'} ${filter.name} ${favoriteFilterIds.includes(filter.id) ? 'from' : 'to'} favorites`}
                aria-pressed={favoriteFilterIds.includes(filter.id)}
              >
                {favoriteFilterIds.includes(filter.id) ? <Star size={12} aria-hidden="true" fill="currentColor" /> : <Star size={12} aria-hidden="true" />}
              </button>
            </article>
          ))}
          {!visibleFilters.length && (
            <p className="tool-note">
              No filters match. Try another search or save a few looks with the star button.
            </p>
          )}
          {visibleFilters.length > filterVisibleCount && (
            <button
              type="button"
              className="button button-quiet filter-load-more"
              onClick={() => setFilterVisibleCount((count) => count + 24)}
            >
              Load 24 more looks · {visibleFilters.length - filterVisibleCount} remaining
            </button>
          )}
        </div>
        <label className="range-control filter-intensity-control">
          <span>
            <span>Filter intensity</span>
            <strong>{filterIntensity}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={filterIntensity}
            disabled={!hasImage || !selectedFilterId}
            onChange={(e) => {
              const value = Number(e.target.value);
              const recipe = FILTER_LIBRARY.find((item) => item.id === selectedFilterId);
              if (recipe) applyLibraryFilter(recipe, value);
            }}
          />
        </label>
        <p className="tool-note">
          Filters use local pixel processing for exposure, tone, color, grain, vignette,
          and detail. Some cinematic glow and bloom recipes remain in the next effects
          pass.
        </p>
      </section>
      <section className="tool-panel" data-panel="effects">
        <div className="section-title">
          <div>
            <p className="eyebrow">QUICK LOOKS</p>
            <h2>Presets</h2>
          </div>
          <span>01 / 07</span>
        </div>
        <div className="preset-grid">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`preset-chip ${activePreset === preset.id ? 'selected' : ''}`}
              onClick={() => applyPreset(preset)}
              disabled={!hasImage}
            >
              <span className={`preset-swatch swatch-${preset.id}`} />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import type { FilterRecipe } from '../lib/types';
import { mapFilterRecipeToManualSettings } from '../lib/filterMapping';
import {
  applyManualAdjustments,
  DEFAULT_MANUAL_ADJUSTMENTS,
} from '../lib/manualEditing';

/** Renders each catalogue look against the current photo using the real export pipeline. */
export default function FilterThumbnail({
  sourceUrl,
  recipe,
}: {
  sourceUrl: string | null;
  recipe: FilterRecipe;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const canvas = canvasRef.current;
    if (!canvas || !sourceUrl) return;

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      const width = 112;
      const height = 84;
      canvas.width = width;
      canvas.height = height;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.clearRect(0, 0, width, height);
      context.drawImage(
        image,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      const settings = mapFilterRecipeToManualSettings(recipe, 100, DEFAULT_MANUAL_ADJUSTMENTS);
      applyManualAdjustments(canvas, settings);
      if (!cancelled) setReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setReady(false);
    };
    image.src = sourceUrl;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [sourceUrl, recipe]);

  return (
    <span className={`filter-thumb-wrap${ready ? ' ready' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="filter-thumb" />
      {!ready && <span className="filter-thumb-placeholder">Preview</span>}
    </span>
  );
}

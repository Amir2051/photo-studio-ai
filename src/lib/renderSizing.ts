/** Keeps interactive canvas work bounded while leaving full-resolution export untouched. */
export function getPreviewDimensions(
  width: number,
  height: number,
  maxEdge = 1800,
): { width: number; height: number; scale: number } {
  if (![width, height, maxEdge].every(Number.isFinite) || width <= 0 || height <= 0 || maxEdge <= 0) {
    throw new Error('Image dimensions and preview edge must be positive finite numbers.');
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

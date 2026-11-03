export type ManualAdjustmentSettings = {
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  hue: number;
  grain: number;
  vignette: number;
  clarity: number;
  texture: number;
  sharpening: number;
  noiseReduction: number;
  curveShadows: number;
  curveDarks: number;
  curveLights: number;
  curveHighlights: number;
  curveRedShadows: number;
  curveRedDarks: number;
  curveRedLights: number;
  curveRedHighlights: number;
  curveGreenShadows: number;
  curveGreenDarks: number;
  curveGreenLights: number;
  curveGreenHighlights: number;
  curveBlueShadows: number;
  curveBlueDarks: number;
  curveBlueLights: number;
  curveBlueHighlights: number;
  hslRedHue: number;
  hslRedSaturation: number;
  hslRedLuminance: number;
  hslOrangeHue: number;
  hslOrangeSaturation: number;
  hslOrangeLuminance: number;
  hslYellowHue: number;
  hslYellowSaturation: number;
  hslYellowLuminance: number;
  hslGreenHue: number;
  hslGreenSaturation: number;
  hslGreenLuminance: number;
  hslAquaHue: number;
  hslAquaSaturation: number;
  hslAquaLuminance: number;
  hslBlueHue: number;
  hslBlueSaturation: number;
  hslBlueLuminance: number;
  hslPurpleHue: number;
  hslPurpleSaturation: number;
  hslPurpleLuminance: number;
  hslMagentaHue: number;
  hslMagentaSaturation: number;
  hslMagentaLuminance: number;
};

export const DEFAULT_MANUAL_ADJUSTMENTS: ManualAdjustmentSettings = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  hue: 0,
  grain: 0,
  vignette: 0,
  clarity: 0,
  texture: 0,
  sharpening: 0,
  noiseReduction: 0,
  curveShadows: 0,
  curveDarks: 0,
  curveLights: 0,
  curveHighlights: 0,
  curveRedShadows: 0,
  curveRedDarks: 0,
  curveRedLights: 0,
  curveRedHighlights: 0,
  curveGreenShadows: 0,
  curveGreenDarks: 0,
  curveGreenLights: 0,
  curveGreenHighlights: 0,
  curveBlueShadows: 0,
  curveBlueDarks: 0,
  curveBlueLights: 0,
  curveBlueHighlights: 0,
  hslRedHue: 0,
  hslRedSaturation: 0,
  hslRedLuminance: 0,
  hslOrangeHue: 0,
  hslOrangeSaturation: 0,
  hslOrangeLuminance: 0,
  hslYellowHue: 0,
  hslYellowSaturation: 0,
  hslYellowLuminance: 0,
  hslGreenHue: 0,
  hslGreenSaturation: 0,
  hslGreenLuminance: 0,
  hslAquaHue: 0,
  hslAquaSaturation: 0,
  hslAquaLuminance: 0,
  hslBlueHue: 0,
  hslBlueSaturation: 0,
  hslBlueLuminance: 0,
  hslPurpleHue: 0,
  hslPurpleSaturation: 0,
  hslPurpleLuminance: 0,
  hslMagentaHue: 0,
  hslMagentaSaturation: 0,
  hslMagentaLuminance: 0,
};

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value));
const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((channel) => clamp((channel + m) * 255)) as [number, number, number];
}

const CURVE_X = [0, 48, 112, 176, 224, 255];

function curveY(settings: ManualAdjustmentSettings, prefix = 'curve'): number[] {
  const read = (part: string) =>
    settings[(prefix + part) as keyof ManualAdjustmentSettings] as number;
  return [
    0,
    clamp(48 + read('Shadows') * 0.48),
    clamp(112 + read('Darks') * 0.48),
    clamp(176 + read('Lights') * 0.48),
    clamp(224 + read('Highlights') * 0.31),
    255,
  ];
}

function applyToneCurve(value: number, ys: number[]): number {
  const x = clamp(value);
  let segment = 0;
  while (segment < CURVE_X.length - 2 && x > CURVE_X[segment + 1]) segment += 1;
  const startX = CURVE_X[segment],
    endX = CURVE_X[segment + 1];
  const amount = (x - startX) / (endX - startX);
  return clamp(ys[segment] + (ys[segment + 1] - ys[segment]) * amount);
}

const HSL_CHANNELS = [
  { name: 'red', center: 0 },
  { name: 'orange', center: 30 },
  { name: 'yellow', center: 60 },
  { name: 'green', center: 120 },
  { name: 'aqua', center: 180 },
  { name: 'blue', center: 220 },
  { name: 'purple', center: 270 },
  { name: 'magenta', center: 315 },
] as const;

function applySelectiveHsl(
  h: number,
  s: number,
  l: number,
  settings: ManualAdjustmentSettings,
): [number, number, number] {
  let hue = h,
    saturation = s,
    lightness = l;
  for (const channel of HSL_CHANNELS) {
    const distance = Math.abs(((h - channel.center + 540) % 360) - 180);
    const width = channel.name === 'red' ? 28 : 32;
    const weight = Math.max(0, 1 - distance / width) ** 2;
    if (!weight) continue;
    const prefix = `hsl${channel.name[0].toUpperCase()}${channel.name.slice(1)}`;
    hue += settings[`${prefix}Hue` as keyof ManualAdjustmentSettings] * weight;
    saturation +=
      (settings[`${prefix}Saturation` as keyof ManualAdjustmentSettings] / 100) * weight;
    lightness += (settings[`${prefix}Luminance` as keyof ManualAdjustmentSettings] / 100) * weight;
  }
  return [(hue + 360) % 360, clamp(saturation, 0, 1), clamp(lightness, 0, 1)];
}

/** Applies a complete manual tone/color/effect pass without mutating the source ImageData. */
export function processManualPixels(
  source: ImageData,
  settings: ManualAdjustmentSettings,
): ImageData {
  const { width, height, data: input } = source;
  const output = new Uint8ClampedArray(input);
  const exposure = 2 ** (settings.exposure / 100);
  const contrast = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
  const saturation = 1 + settings.saturation / 100;
  const vibrance = settings.vibrance / 100;
  const hueShift = settings.hue;
  const temperature = settings.temperature * 0.45;
  const tint = settings.tint * 0.3;
  const curve = curveY(settings);
  const redCurve = curveY(settings, 'curveRed');
  const greenCurve = curveY(settings, 'curveGreen');
  const blueCurve = curveY(settings, 'curveBlue');
  const hasCurve = [curve, redCurve, greenCurve, blueCurve].some((points) =>
    points.some((value, index) => value !== CURVE_X[index]),
  );
  const hasSelectiveHsl = HSL_CHANNELS.some(({ name }) => {
    const prefix = `hsl${name[0].toUpperCase()}${name.slice(1)}`;
    return (
      settings[`${prefix}Hue` as keyof ManualAdjustmentSettings] !== 0 ||
      settings[`${prefix}Saturation` as keyof ManualAdjustmentSettings] !== 0 ||
      settings[`${prefix}Luminance` as keyof ManualAdjustmentSettings] !== 0
    );
  });

  for (let i = 0; i < output.length; i += 4) {
    const originalR = input[i],
      originalG = input[i + 1],
      originalB = input[i + 2];
    let r = originalR * exposure + settings.brightness * 1.15;
    let g = originalG * exposure + settings.brightness * 1.15;
    let b = originalB * exposure + settings.brightness * 1.15;
    const y = luminance(r, g, b);
    const normalizedLuminance = clamp(y, 0, 255) / 255;
    const shadowWeight = (1 - normalizedLuminance) ** 1.7;
    const highlightWeight = normalizedLuminance ** 1.7;
    const whiteWeight = Math.max(0, (normalizedLuminance * 255 - 170) / 85);
    const blackWeight = Math.max(0, (85 - normalizedLuminance * 255) / 85);
    const tonal =
      settings.shadows * shadowWeight * 0.72 +
      settings.highlights * highlightWeight * 0.72 +
      settings.whites * whiteWeight * 0.5 +
      settings.blacks * blackWeight * 0.5;
    r += tonal;
    g += tonal;
    b += tonal;
    r = contrast * (r - 128) + 128;
    g = contrast * (g - 128) + 128;
    b = contrast * (b - 128) + 128;
    r += temperature + tint * 0.25;
    g += tint;
    b -= temperature - tint * 0.25;
    if (hasCurve) {
      r = applyToneCurve(applyToneCurve(r, curve), redCurve);
      g = applyToneCurve(applyToneCurve(g, curve), greenCurve);
      b = applyToneCurve(applyToneCurve(b, curve), blueCurve);
    }
    if (hueShift === 0 && saturation === 1 && vibrance === 0 && !hasSelectiveHsl) {
      output[i] = clamp(r);
      output[i + 1] = clamp(g);
      output[i + 2] = clamp(b);
      continue;
    }
    const [h, s, l] = rgbToHsl(clamp(r), clamp(g), clamp(b));
    const vibranceFactor = 1 + vibrance * (1 - Math.min(1, s));
    const [selectiveHue, selectiveSaturation, selectiveLightness] = applySelectiveHsl(
      h,
      s,
      l,
      settings,
    );
    const [nr, ng, nb] = hslToRgb(
      (selectiveHue + hueShift + 360) % 360,
      clamp(selectiveSaturation * saturation * vibranceFactor, 0, 1),
      selectiveLightness,
    );
    output[i] = nr;
    output[i + 1] = ng;
    output[i + 2] = nb;
  }

  const grain = Math.max(0, Math.min(100, settings.grain)) / 100;
  const vignette = Math.max(-100, Math.min(100, settings.vignette)) / 100;
  if (grain || vignette) {
    const cx = (width - 1) / 2,
      cy = (height - 1) / 2;
    const maxDistance = Math.sqrt(cx * cx + cy * cy) || 1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (grain) {
          // Stable per-pixel grain keeps preview/export from flickering between renders.
          let seed = (x * 374761393 + y * 668265263) | 0;
          seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
          const noise = (((seed ^ (seed >>> 16)) >>> 0) / 4294967295 - 0.5) * 42 * grain;
          output[i] = clamp(output[i] + noise);
          output[i + 1] = clamp(output[i + 1] + noise);
          output[i + 2] = clamp(output[i + 2] + noise);
        }
        if (vignette) {
          const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDistance;
          const amount = Math.max(0, (distance - 0.22) / 0.78) ** 2 * Math.abs(vignette) * 0.72;
          const factor = vignette > 0 ? 1 - amount : 1 + amount * 0.55;
          output[i] = clamp(output[i] * factor);
          output[i + 1] = clamp(output[i + 1] * factor);
          output[i + 2] = clamp(output[i + 2] * factor);
        }
      }
    }
  }
  return new ImageData(output, width, height);
}

/** Applies local clarity, texture, sharpening and denoising. */
export function applyDetailEffects(
  canvas: HTMLCanvasElement,
  settings: ManualAdjustmentSettings,
): void {
  const { clarity, texture, sharpening, noiseReduction } = settings;
  if (!clarity && !texture && !sharpening && !noiseReduction) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const { width, height } = canvas;
  const source = ctx.getImageData(0, 0, width, height);
  const input = source.data;
  const blurred = new Uint8ClampedArray(input.length);
  // One 3x3 RGB neighborhood pass keeps processing bounded for full-resolution exports.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const px = Math.max(0, Math.min(width - 1, x + ox));
          const py = Math.max(0, Math.min(height - 1, y + oy));
          const j = (py * width + px) * 4;
          r += input[j];
          g += input[j + 1];
          b += input[j + 2];
          count++;
        }
      const i = (y * width + x) * 4;
      blurred[i] = r / count;
      blurred[i + 1] = g / count;
      blurred[i + 2] = b / count;
    }
  const output = new Uint8ClampedArray(input);
  const denoise = Math.max(0, Math.min(100, noiseReduction)) / 100;
  const sharpen = Math.max(0, Math.min(100, sharpening)) / 100;
  const clarityAmount = clarity / 100;
  const textureAmount = texture / 100;
  for (let i = 0; i < input.length; i += 4)
    for (let c = 0; c < 3; c++) {
      const original = input[i + c],
        detail = original - blurred[i + c];
      const denoised = original * (1 - denoise * 0.72) + blurred[i + c] * denoise * 0.72;
      output[i + c] = clamp(
        denoised + detail * (sharpen * 1.35 + textureAmount * 0.8 + clarityAmount * 1.15),
      );
    }
  ctx.putImageData(new ImageData(output, width, height), 0, 0);
}

/** Renders the manual pipeline into an existing canvas. */
export function applyManualAdjustments(
  canvas: HTMLCanvasElement,
  settings: ManualAdjustmentSettings,
): void {
  if (
    Object.entries(settings).every(
      ([key, value]) => value === DEFAULT_MANUAL_ADJUSTMENTS[key as keyof ManualAdjustmentSettings],
    )
  )
    return;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  context.putImageData(processManualPixels(image, settings), 0, 0);
  applyDetailEffects(canvas, settings);
}

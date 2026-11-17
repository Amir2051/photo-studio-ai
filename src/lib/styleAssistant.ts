import { FILTER_LIBRARY } from './filters';
import type { FilterRecipe } from './types';

export type StyleSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
};

export type StyleInterpretation = {
  settings: StyleSettings;
  filterId: string;
  filterIntensity: number;
  retouchEnabled: boolean;
  retouchStrength: number;
  matchedFilter: string | null;
  explanation: string[];
};

const BASE: StyleSettings = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function findFilter(prompt: string): FilterRecipe | undefined {
  const normalized = prompt.toLowerCase();
  const explicit = FILTER_LIBRARY.find((filter) => normalized.includes(filter.name.toLowerCase()));
  if (explicit) return explicit;

  const aliases: Record<string, string[]> = {
    cinematic: ['cinematic', 'movie', 'film still', 'teal orange'],
    luxury: ['luxury', 'editorial', 'high fashion', 'fashion campaign', 'premium'],
    golden: ['golden hour', 'sunset', 'sun-kissed', 'sun kissed'],
    vintage: ['vintage', 'retro', 'nostalgic', 'film look'],
    moody: ['moody', 'dark and dramatic', 'dramatic'],
    natural: ['natural', 'clean', 'true to life', 'realistic'],
    pastel: ['pastel', 'airy', 'soft light'],
    blackwhite: ['black and white', 'black-white', 'monochrome', 'grayscale'],
    street: ['street', 'urban'],
    travel: ['travel', 'vacation'],
  };
  const match = Object.entries(aliases).find(([, terms]) =>
    terms.some((term) => normalized.includes(term)),
  );
  if (!match) return undefined;
  const terms = match[1];
  return FILTER_LIBRARY.find((filter) => {
    const haystack =
      `${filter.name} ${filter.description} ${filter.tokens.join(' ')} ${filter.category}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });
}

/** Deterministic, on-device command interpreter. It does not call a cloud model. */
export function interpretStylePrompt(input: string): StyleInterpretation {
  const prompt = input.trim().toLowerCase();
  if (prompt.length < 3) throw new Error('Describe the look you want in a few words.');
  const settings = { ...BASE };
  const explanation: string[] = [];

  if (/warm|golden|sun.?kiss|amber|cozy/.test(prompt)) {
    settings.warmth += 18;
    settings.saturation += 5;
    explanation.push('Added warm color temperature and a small saturation lift.');
  }
  if (/cool|blue|icy|winter/.test(prompt)) {
    settings.warmth -= 18;
    explanation.push('Shifted the color temperature cooler.');
  }
  if (/bright|airy|lighten|high.?key|lift/.test(prompt)) {
    settings.brightness += 8;
    explanation.push('Lifted overall brightness.');
  }
  if (/dark|moody|low.?key|dramatic/.test(prompt)) {
    settings.brightness -= 6;
    settings.contrast += 12;
    explanation.push('Lowered brightness and increased contrast for a moodier look.');
  }
  if (/contrast|crisp|punchy|dramatic|cinematic/.test(prompt)) {
    settings.contrast += 10;
    explanation.push('Added contrast for more definition.');
  }
  if (/muted|desaturated|subtle color|understated/.test(prompt)) {
    settings.saturation -= 22;
    explanation.push('Reduced saturation for a muted palette.');
  } else if (/vivid|vibrant|colorful|rich color/.test(prompt)) {
    settings.saturation += 22;
    explanation.push('Boosted color saturation.');
  }
  if (/soft|gentle|flattering|portrait/.test(prompt)) {
    settings.contrast -= 5;
    explanation.push('Softened contrast for a gentler portrait finish.');
  }

  const filter = findFilter(prompt);
  const filterIntensity = filter ? 65 : 100;
  if (filter) {
    const amount = filterIntensity / 100;
    const values = filter.adjustments;
    const filterSettings: StyleSettings = {
      brightness: clamp(
        100 + ((values.exposure ?? 0) + (values.brightness ?? 0)) * 100 * amount,
        50,
        150,
      ),
      contrast: clamp(100 + (values.contrast ?? 0) * 100 * amount, 50, 160),
      saturation: clamp(100 + (values.saturation ?? 0) * 100 * amount, 0, 180),
      warmth: clamp((values.temperature ?? 0) * 200 * amount, -60, 60),
    };
    settings.brightness = filterSettings.brightness + (settings.brightness - BASE.brightness);
    settings.contrast = filterSettings.contrast + (settings.contrast - BASE.contrast);
    settings.saturation = filterSettings.saturation + (settings.saturation - BASE.saturation);
    settings.warmth = filterSettings.warmth + settings.warmth;
    explanation.push(
      `Selected the “${filter.name}” library look at ${filterIntensity}% as the recipe base.`,
    );
  }

  const retouchEnabled =
    /smooth skin|skin smoothing|beauty retouch|retouch skin|blemish|soften skin/.test(prompt);
  const retouchStrength = retouchEnabled
    ? /subtle|light|slight/.test(prompt)
      ? 20
      : /strong|heavy/.test(prompt)
        ? 55
        : 35
    : 0;
  if (retouchEnabled)
    explanation.push(`Enabled face-aware skin smoothing at ${retouchStrength}% strength.`);

  if (!explanation.length) {
    explanation.push(
      'No recognized style controls were found. Try warm, cool, bright, moody, cinematic, muted, vivid, soft portrait, or smooth skin.',
    );
  }

  return {
    settings: {
      brightness: clamp(settings.brightness, 50, 150),
      contrast: clamp(settings.contrast, 50, 160),
      saturation: clamp(settings.saturation, 0, 180),
      warmth: clamp(settings.warmth, -60, 60),
    },
    filterId: filter?.id ?? '',
    filterIntensity,
    retouchEnabled,
    retouchStrength,
    matchedFilter: filter?.name ?? null,
    explanation,
  };
}

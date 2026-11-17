import { describe, expect, it } from 'vitest';
import { interpretStylePrompt } from '../src/lib/styleAssistant';

describe('local style assistant', () => {
  it('interprets warm cinematic direction and finds a library filter', () => {
    const result = interpretStylePrompt('Give this a warm cinematic film look with more contrast');
    expect(result.settings.warmth).toBeGreaterThan(0);
    expect(result.settings.contrast).toBeGreaterThan(100);
    expect(result.filterId).not.toBe('');
    expect(result.matchedFilter).toBeTruthy();
  });

  it('supports cool, muted and subtle skin retouch requests', () => {
    const result = interpretStylePrompt('Cool muted tones, subtle skin smoothing');
    expect(result.settings.warmth).toBeLessThan(0);
    expect(result.settings.saturation).toBeLessThan(100);
    expect(result.retouchEnabled).toBe(true);
    expect(result.retouchStrength).toBe(20);
  });

  it('rejects empty or too-short instructions', () => {
    expect(() => interpretStylePrompt('  ')).toThrow();
    expect(() => interpretStylePrompt('ok')).toThrow();
  });

  it('keeps every output inside editor control limits', () => {
    const result = interpretStylePrompt('very bright vivid dramatic warm cool fashion editorial');
    expect(result.settings.brightness).toBeGreaterThanOrEqual(50);
    expect(result.settings.brightness).toBeLessThanOrEqual(150);
    expect(result.settings.contrast).toBeGreaterThanOrEqual(50);
    expect(result.settings.contrast).toBeLessThanOrEqual(160);
    expect(result.settings.saturation).toBeGreaterThanOrEqual(0);
    expect(result.settings.saturation).toBeLessThanOrEqual(180);
    expect(result.settings.warmth).toBeGreaterThanOrEqual(-60);
    expect(result.settings.warmth).toBeLessThanOrEqual(60);
  });
});

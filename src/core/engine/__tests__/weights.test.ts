import { describe, expect, it } from 'vitest';
import { PLACE_WEIGHTS, RECIPE_WEIGHTS, validateWeights } from '../weights';
import { ingredientMatch } from '../scorers/ingredientMatch';
import { weatherFit } from '../scorers/weatherFit';
import { timeFit } from '../scorers/timeFit';
import { moodFit } from '../scorers/moodFit';
import { tasteFit } from '../scorers/tasteFit';
import { seasonFit } from '../scorers/seasonFit';
import { trendFit } from '../scorers/trendFit';
import { novelty } from '../scorers/novelty';
import { distanceFit, placeMood, placeSeason, placeTrend } from '../scorers/placeScorers';

describe('权重配置', () => {
  it('RECIPE_WEIGHTS 权重和为 1', () => {
    const sum = Object.values(RECIPE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(() => validateWeights(RECIPE_WEIGHTS)).not.toThrow();
  });

  it('PLACE_WEIGHTS 权重和为 1', () => {
    const sum = Object.values(PLACE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(() => validateWeights(PLACE_WEIGHTS)).not.toThrow();
  });

  it('validateWeights 对非法权重抛错', () => {
    expect(() => validateWeights({ a: 0.5, b: 0.6 })).toThrow();
  });

  it('每个菜谱 scorer 都有对应权重项', () => {
    const keys = [ingredientMatch, weatherFit, timeFit, moodFit, tasteFit, seasonFit, trendFit, novelty].map((s) => s.key);
    for (const key of keys) {
      expect(RECIPE_WEIGHTS[key]).toBeDefined();
    }
  });

  it('每个商户 scorer 都有对应权重项', () => {
    const keys = [distanceFit, placeTrend, placeSeason, placeMood].map((s) => s.key);
    for (const key of keys) {
      expect(PLACE_WEIGHTS[key]).toBeDefined();
    }
  });
});

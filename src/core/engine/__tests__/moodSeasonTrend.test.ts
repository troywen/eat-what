import { describe, expect, it } from 'vitest';
import { moodFit } from '../scorers/moodFit';
import { seasonFit } from '../scorers/seasonFit';
import { trendFit } from '../scorers/trendFit';
import { makeCtx, makeRecipe } from './helpers';

describe('moodFit scorer', () => {
  const comfortFood = makeRecipe({ moods: ['blue', 'tired'] });

  it('心情命中 → 1.0，理由说明适配', () => {
    const r = moodFit.score(comfortFood, makeCtx({ mood: 'blue' }));
    expect(r.score).toBe(1);
    expect(r.reason).toContain('有点丧');
  });

  it('心情不命中 → 0.4', () => {
    const r = moodFit.score(comfortFood, makeCtx({ mood: 'adventurous' }));
    expect(r.score).toBe(0.4);
    expect(r.reason).toBeTruthy();
  });
});

describe('seasonFit scorer', () => {
  const winterDish = makeRecipe({ seasonMonths: [11, 12, 1, 2] });

  it('当月在适宜月份内 → 1.0', () => {
    const jan = new Date(2026, 0, 15, 12);
    expect(seasonFit.score(winterDish, makeCtx({ now: jan })).score).toBe(1);
  });

  it('当月不在适宜月份 → 0.5', () => {
    const jul = new Date(2026, 6, 15, 12);
    expect(seasonFit.score(winterDish, makeCtx({ now: jul })).score).toBe(0.5);
  });
});

describe('trendFit scorer', () => {
  it('直接透传 trendScore', () => {
    expect(trendFit.score(makeRecipe({ trendScore: 0.93 }), makeCtx()).score).toBe(0.93);
    expect(trendFit.score(makeRecipe({ trendScore: 0.1 }), makeCtx()).score).toBe(0.1);
  });
});

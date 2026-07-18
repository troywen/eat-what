import { describe, expect, it } from 'vitest';
import { novelty } from '../scorers/novelty';
import { makeCtx, makeRecipe } from './helpers';

describe('novelty scorer', () => {
  const dish = makeRecipe({ id: 'r999' });

  it('最近吃过 → 0 分降权，理由提示换口味', () => {
    const r = novelty.score(dish, makeCtx({ recentEaten: ['r999'] }));
    expect(r.score).toBe(0);
    expect(r.reason).toContain('换');
  });

  it('最近没吃过 → 1 分', () => {
    expect(novelty.score(dish, makeCtx({ recentEaten: ['r001', 'r002'] })).score).toBe(1);
    expect(novelty.score(dish, makeCtx()).score).toBe(1);
  });
});

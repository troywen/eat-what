import { describe, expect, it } from 'vitest';
import { tasteFit } from '../scorers/tasteFit';
import { RECIPE_WEIGHTS } from '../weights';
import { makeCtx, makeRecipe } from './helpers';

const heavyDish = makeRecipe({ tastes: ['spicy', 'savory'] });
const lightDish = makeRecipe({ tastes: ['light', 'sour'] });
const mixedDish = makeRecipe({ tastes: ['spicy', 'sweet'] });

describe('tasteFit scorer', () => {
  it('重口极端（bias=1）：重口菜满分，清淡菜低分', () => {
    const ctx = makeCtx({ tasteBias: 1 });
    const heavy = tasteFit.score(heavyDish, ctx);
    const light = tasteFit.score(lightDish, ctx);
    expect(heavy.score).toBe(1);
    expect(heavy.reason).toContain('重口');
    expect(light.score).toBeLessThan(0.5);
  });

  it('清淡极端（bias=0）：清淡菜满分，重口菜低分', () => {
    const ctx = makeCtx({ tasteBias: 0 });
    const light = tasteFit.score(lightDish, ctx);
    const heavy = tasteFit.score(heavyDish, ctx);
    expect(light.score).toBe(1);
    expect(light.reason).toContain('清淡');
    expect(heavy.score).toBeLessThan(0.5);
  });

  it('中性（bias=0.5 及缺省）：全部 0.7', () => {
    expect(tasteFit.score(heavyDish, makeCtx({ tasteBias: 0.5 })).score).toBe(0.7);
    expect(tasteFit.score(lightDish, makeCtx()).score).toBe(0.7); // 缺省视为 0.5
    expect(tasteFit.score(mixedDish, makeCtx({ tasteBias: 0.53 })).score).toBe(0.7);
  });

  it('偏离越大区分越明显：bias=0.8 的分差小于 bias=1.0 的分差', () => {
    const mild = tasteFit.score(heavyDish, makeCtx({ tasteBias: 0.8 })).score;
    const extreme = tasteFit.score(heavyDish, makeCtx({ tasteBias: 1 })).score;
    expect(extreme).toBeGreaterThan(mild);
    expect(mild).toBeGreaterThan(0.7);
  });

  it('混合口味菜得分居中', () => {
    const score = tasteFit.score(mixedDish, makeCtx({ tasteBias: 1 })).score;
    expect(score).toBeCloseTo(0.7); // 一重一轻相互抵消
  });

  it('分数始终在 [0,1] 且理由非空', () => {
    for (const bias of [0, 0.2, 0.5, 0.8, 1]) {
      const r = tasteFit.score(heavyDish, makeCtx({ tasteBias: bias }));
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.reason).toBeTruthy();
    }
  });
});

describe('新权重表', () => {
  it('RECIPE_WEIGHTS 权重和为 1 且包含 tasteFit', () => {
    const sum = Object.values(RECIPE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(RECIPE_WEIGHTS.tasteFit).toBeCloseTo(0.08);
    expect(RECIPE_WEIGHTS.ingredientMatch).toBeCloseTo(0.32);
    expect(RECIPE_WEIGHTS.novelty).toBeCloseTo(0.01);
  });
});

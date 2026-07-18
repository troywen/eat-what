import { describe, expect, it } from 'vitest';
import { RECIPES } from '../../data/recipes';
import { recommend } from '../recommend';
import { makeCtx } from './helpers';

describe('RECIPES 菜谱数据合法性', () => {
  it('id 全局唯一', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每道菜字段合法：steps≥4、cookMinutes>0、mealSlots 非空、seasonMonths 在 1-12', () => {
    for (const r of RECIPES) {
      expect(r.steps.length, `${r.id} ${r.name} steps`).toBeGreaterThanOrEqual(4);
      expect(r.cookMinutes, `${r.id} cookMinutes`).toBeGreaterThan(0);
      expect(r.mealSlots.length, `${r.id} mealSlots`).toBeGreaterThan(0);
      expect(r.seasonMonths.length, `${r.id} seasonMonths`).toBeGreaterThan(0);
      for (const m of r.seasonMonths) {
        expect(m, `${r.id} seasonMonth`).toBeGreaterThanOrEqual(1);
        expect(m, `${r.id} seasonMonth`).toBeLessThanOrEqual(12);
      }
      expect(r.name.trim(), `${r.id} name`).toBeTruthy();
      expect(r.description.trim(), `${r.id} description`).toBeTruthy();
      expect(r.ingredients.length, `${r.id} ingredients`).toBeGreaterThan(0);
      for (const ing of r.ingredients) {
        expect(ing.name.trim(), `${r.id} 食材名`).toBeTruthy();
        expect(ing.amount.trim(), `${r.id} ${ing.name} 用量`).toBeTruthy();
      }
      if (r.servings !== undefined) {
        expect(r.servings, `${r.id} servings`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('救急菜存在：蒸蛋羹 / 酱油拌饭 / 腊肠炒饭', () => {
    const names = RECIPES.map((r) => r.name);
    expect(names).toContain('蒸蛋羹');
    expect(names).toContain('酱油拌饭');
    expect(names).toContain('腊肠炒饭');
  });
});

describe('救急菜推荐场景（冰箱快空了）', () => {
  it('冰箱只有鸡蛋 → 蒸蛋羹进 Top3', () => {
    const result = recommend(
      'cook',
      makeCtx({ ingredients: ['鸡蛋'], now: new Date(2026, 6, 17, 19, 0, 0), mood: 'tired' }),
    );
    const topIds = result.recipes.map((r) => r.candidate.id);
    expect(topIds).toContain('r029');
  });

  it('冰箱只有米饭+腊肠 → 腊肠炒饭进 Top3', () => {
    const result = recommend(
      'cook',
      makeCtx({ ingredients: ['米饭', '腊肠'], now: new Date(2026, 6, 17, 19, 0, 0) }),
    );
    const topIds = result.recipes.map((r) => r.candidate.id);
    expect(topIds).toContain('r031');
  });
});

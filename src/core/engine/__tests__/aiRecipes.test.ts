import { describe, expect, it } from 'vitest';
import { validateRecipe } from '../../services/aiRecipes';
import { RECIPES } from '../../data/recipes';
import { makeRecipe } from './helpers';

describe('validateRecipe', () => {
  it('合法样本通过：makeRecipe 与库内真实菜谱全部通过', () => {
    expect(validateRecipe(makeRecipe())).toBe(true);
    for (const r of RECIPES) {
      expect(validateRecipe(r), `${r.id} ${r.name} 应通过校验`).toBe(true);
    }
  });

  it('非对象 / null / 数组拒绝', () => {
    expect(validateRecipe(null)).toBe(false);
    expect(validateRecipe('recipe')).toBe(false);
    expect(validateRecipe([])).toBe(false);
  });

  it('缺必填字段拒绝（无 id / 无 course / 空 name）', () => {
    const { id: _id, ...noId } = makeRecipe();
    expect(validateRecipe(noId)).toBe(false);
    const { course: _c, ...noCourse } = makeRecipe();
    expect(validateRecipe(noCourse)).toBe(false);
    expect(validateRecipe(makeRecipe({ name: '  ' }))).toBe(false);
  });

  it('course 非法值拒绝', () => {
    expect(validateRecipe(makeRecipe({ course: 'dessert' as never }))).toBe(false);
  });

  it('steps 不足 4 步 / 含空步骤拒绝', () => {
    expect(validateRecipe(makeRecipe({ steps: ['一步', '两步', '三步'] }))).toBe(false);
    expect(validateRecipe(makeRecipe({ steps: ['一', '二', '三', ''] }))).toBe(false);
  });

  it('seasonMonths 越界（0 / 13 / 非整数）拒绝，空数组拒绝', () => {
    expect(validateRecipe(makeRecipe({ seasonMonths: [0, 6] }))).toBe(false);
    expect(validateRecipe(makeRecipe({ seasonMonths: [13] }))).toBe(false);
    expect(validateRecipe(makeRecipe({ seasonMonths: [1.5] }))).toBe(false);
    expect(validateRecipe(makeRecipe({ seasonMonths: [] }))).toBe(false);
  });

  it('cookMinutes / difficulty / trendScore 类型或取值非法拒绝', () => {
    expect(validateRecipe(makeRecipe({ cookMinutes: 0 }))).toBe(false);
    expect(validateRecipe(makeRecipe({ cookMinutes: '15' as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ difficulty: 4 as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ trendScore: Number.NaN }))).toBe(false);
  });

  it('mealSlots / tastes / moods 含非法枚举拒绝，warmth 非法拒绝', () => {
    expect(validateRecipe(makeRecipe({ mealSlots: ['brunch'] as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ tastes: ['bitter'] as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ moods: ['angry'] as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ warmth: 'freezing' as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ mealSlots: [] }))).toBe(false);
  });

  it('ingredients 结构非法拒绝（空数组 / 缺 amount / 空 name）', () => {
    expect(validateRecipe(makeRecipe({ ingredients: [] }))).toBe(false);
    expect(validateRecipe(makeRecipe({ ingredients: [{ name: '鸡蛋' }] as never }))).toBe(false);
    expect(validateRecipe(makeRecipe({ ingredients: [{ name: '', amount: '2个' }] }))).toBe(false);
  });

  it('servings 可缺省，非法值（0 / 负数 / 字符串）拒绝', () => {
    const { servings: _s, ...noServings } = makeRecipe({ servings: 2 });
    expect(validateRecipe(noServings)).toBe(true);
    expect(validateRecipe(makeRecipe({ servings: 0 }))).toBe(false);
    expect(validateRecipe(makeRecipe({ servings: -1 }))).toBe(false);
    expect(validateRecipe(makeRecipe({ servings: '2' as never }))).toBe(false);
  });
});

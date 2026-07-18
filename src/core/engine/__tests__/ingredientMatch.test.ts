import { describe, expect, it } from 'vitest';
import { ingredientHit, ingredientMatch, isPantryStaple, missingIngredients } from '../scorers/ingredientMatch';
import { RECIPES } from '../../data/recipes';
import { makeCtx, makeRecipe } from './helpers';

describe('ingredientHit 匹配规则', () => {
  it('完全相同的名字命中', () => {
    expect(ingredientHit('鸡蛋', '鸡蛋')).toBe(true);
  });
  it('包含关系命中（用户「鸡蛋」命中菜谱「蛋」）', () => {
    expect(ingredientHit('鸡蛋', '蛋')).toBe(true);
    expect(ingredientHit('蛋', '鸡蛋')).toBe(true);
  });
  it('别名命中（西红柿 ↔ 番茄、马铃薯 ↔ 土豆）', () => {
    expect(ingredientHit('西红柿', '番茄')).toBe(true);
    expect(ingredientHit('马铃薯', '土豆')).toBe(true);
    expect(ingredientHit('香葱', '小葱')).toBe(true);
  });
  it('不相关的食材不命中', () => {
    expect(ingredientHit('蛋糕', '鸡蛋')).toBe(false);
    expect(ingredientHit('牛肉', '鸡蛋')).toBe(false);
  });
  it('面类别名：挂面命中需「面条」的菜（双向）', () => {
    expect(ingredientHit('挂面', '面条')).toBe(true);
    expect(ingredientHit('面条', '拉面')).toBe(true);
    expect(ingredientHit('鲜面条', '挂面')).toBe(true);
  });
  it('米类别名：米饭/剩饭命中需「大米」的菜', () => {
    expect(ingredientHit('米饭', '大米')).toBe(true);
    expect(ingredientHit('剩饭', '大米')).toBe(true);
  });
  it('肠类别名：腊肠/火腿肠命中需「香肠」的菜', () => {
    expect(ingredientHit('腊肠', '香肠')).toBe(true);
    expect(ingredientHit('火腿肠', '香肠')).toBe(true);
  });
  it('绿叶菜泛称组双向命中：青菜 ↔ 菠菜/油麦菜', () => {
    expect(ingredientHit('青菜', '菠菜')).toBe(true);
    expect(ingredientHit('菠菜', '青菜')).toBe(true);
    expect(ingredientHit('油麦菜', '上海青')).toBe(true);
    expect(ingredientHit('小白菜', '生菜')).toBe(true);
  });
  it('肥牛 ↔ 肥牛卷', () => {
    expect(ingredientHit('肥牛', '肥牛卷')).toBe(true);
    expect(ingredientHit('肥牛卷', '肥牛')).toBe(true);
  });
  it('别名跨组不命中：面条 ≠ 米饭，青菜 ≠ 菠菜以外的肉', () => {
    expect(ingredientHit('面条', '米饭')).toBe(false);
    expect(ingredientHit('青菜', '五花肉')).toBe(false);
  });
});

describe('isPantryStaple 常备调料判定', () => {
  it('常见调料全部识别（含 recipes.ts 实际出现的变体）', () => {
    for (const name of ['盐', '白糖', '冰糖', '生抽', '老抽', '醋', '香油', '食用油', '料酒', '蚝油', '淀粉', '白胡椒粉', '花椒', '八角', '豆瓣酱', '清水']) {
      expect(isPantryStaple(name)).toBe(true);
    }
  });
  it('主食材不误判', () => {
    for (const name of ['鸡蛋', '番茄', '五花肉', '西兰花']) {
      expect(isPantryStaple(name)).toBe(false);
    }
  });
});

describe('ingredientMatch scorer（主食材/调料分离新语义）', () => {
  const recipe = makeRecipe(); // 主食材：鸡蛋、番茄、小葱；调料：盐

  it('主食材齐全 → 1.0，reason 说明齐全', () => {
    const r = ingredientMatch.score(recipe, makeCtx({ ingredients: ['鸡蛋', '番茄', '小葱'] }));
    expect(r.score).toBe(1);
    expect(r.reason).toContain('主食材齐全');
  });

  it('缺 1 样主食材 → 0.9×(2/3)+0.1 ≈ 0.7，reason 只列非调料缺料', () => {
    const r = ingredientMatch.score(recipe, makeCtx({ ingredients: ['鸡蛋', '番茄'] }));
    expect(r.score).toBeCloseTo(0.9 * (2 / 3) + 0.1, 5);
    expect(r.reason).toContain('主食材命中 2/3');
    expect(r.reason).toContain('还缺：小葱');
    expect(r.reason).not.toContain('盐');
  });

  it('只有 1 样主食材 → 0.9×(1/3)+0.1 = 0.4', () => {
    const r = ingredientMatch.score(recipe, makeCtx({ ingredients: ['鸡蛋'] }));
    expect(r.score).toBeCloseTo(0.4, 5);
    expect(r.reason).toContain('主食材命中 1/3');
  });

  it('全缺主食材但调料齐全 → 命中数为 0，reason 不拿调料充数', () => {
    const r = ingredientMatch.score(recipe, makeCtx({ ingredients: ['盐', '生抽', '香油'] }));
    expect(r.reason).toContain('主食材命中 0/3');
    expect(r.score).toBeCloseTo(0.1, 5); // 只有调料保底分
  });

  it('别名食材参与命中：有「西红柿」视为有番茄', () => {
    const r = ingredientMatch.score(recipe, makeCtx({ ingredients: ['鸡蛋', '西红柿', '小葱'] }));
    expect(r.score).toBe(1);
  });

  it('分数始终在 [0,1] 且理由非空', () => {
    const r = ingredientMatch.score(recipe, makeCtx({ ingredients: ['土豆'] }));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.reason).toBeTruthy();
  });
});

describe('missingIngredients 缺料清单', () => {
  const recipe = makeRecipe();

  it('全有 → 空数组', () => {
    expect(missingIngredients(recipe, ['鸡蛋', '番茄', '小葱'])).toEqual([]);
  });

  it('部分缺 → 返回缺的非 PANTRY 食材名，不含调料', () => {
    expect(missingIngredients(recipe, ['鸡蛋'])).toEqual(['番茄', '小葱']);
  });

  it('别名命中不重复列（有「西红柿」「蛋」→ 不缺番茄和鸡蛋）', () => {
    expect(missingIngredients(recipe, ['西红柿', '蛋'])).toEqual(['小葱']);
  });

  it('真实菜谱：番茄炒蛋缺牛肉不相关', () => {
    const fanqie = RECIPES.find((r) => r.id === 'r006')!;
    expect(missingIngredients(fanqie, ['鸡蛋', '番茄', '小葱'])).toEqual([]);
    expect(missingIngredients(fanqie, ['牛肉'])).toEqual(['鸡蛋', '番茄', '小葱']);
  });

  it('真实菜谱：有「挂面」视为番茄鸡蛋面（r001）的面条已齐', () => {
    const noodle = RECIPES.find((r) => r.id === 'r001')!;
    expect(missingIngredients(noodle, ['鸡蛋', '番茄', '挂面', '小葱'])).toEqual([]);
  });

  it('真实菜谱：有「米饭」命中需「大米」的蛋炒饭（r026）', () => {
    const friedRice = RECIPES.find((r) => r.id === 'r026')!;
    expect(missingIngredients(friedRice, ['米饭', '鸡蛋', '腊肠', '小葱'])).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { ensureMeatDiversity, recommend } from '../recommend';
import { ingredientHit, isPantryStaple } from '../scorers/ingredientMatch';
import { RECIPES } from '../../data/recipes';
import type { Course, Recommendation, Recipe } from '../../types';
import { makeCtx, makeRecipe, makeWeather } from './helpers';

const baseCtx = makeCtx({
  ingredients: ['鸡蛋', '番茄', '小葱', '面条', '五花肉', '青椒', '蒜', '豆腐'],
  mood: 'tired',
  availableMinutes: 30,
});

describe('recommend 模式路由', () => {
  it('cook 模式：返回 Top3 菜谱，不返回商户', () => {
    const result = recommend('cook', baseCtx);
    expect(result.mode).toBe('cook');
    expect(result.recipes).toHaveLength(3);
    expect(result.places).toHaveLength(0);
  });

  it('topN 参数：cook / places 分支都生效，默认仍为 3', () => {
    expect(recommend('cook', baseCtx, 5).recipes).toHaveLength(5);
    expect(recommend('cook', baseCtx).recipes).toHaveLength(3);
    expect(recommend('dineout', baseCtx, 5).places).toHaveLength(5);
    expect(recommend('dineout', baseCtx).places).toHaveLength(3);
    // topN 超过候选数时返回全部候选
    const all = recommend('dineout', baseCtx, 999);
    expect(all.places.length).toBeGreaterThan(3);
  });

  it('cook 模式：结果按总分降序，breakdown 含全部 8 个 scorer', () => {
    const { recipes } = recommend('cook', baseCtx);
    expect(recipes[0].totalScore).toBeGreaterThanOrEqual(recipes[1].totalScore);
    expect(recipes[1].totalScore).toBeGreaterThanOrEqual(recipes[2].totalScore);
    for (const rec of recipes) {
      expect(rec.breakdown).toHaveLength(8);
      const weightSum = rec.breakdown.reduce((a, b) => a + b.weight, 0);
      expect(weightSum).toBeCloseTo(1, 9);
      expect(rec.summary.length).toBeGreaterThan(0);
    }
  });

  it('takeout 模式：只返回 scene 含 takeout 的商户', () => {
    const result = recommend('takeout', baseCtx);
    expect(result.mode).toBe('takeout');
    expect(result.recipes).toHaveLength(0);
    expect(result.places).toHaveLength(3);
    for (const p of result.places) {
      expect(p.candidate.scene).toContain('takeout');
    }
  });

  it('dineout 模式：只返回 scene 含 dineout 的商户', () => {
    const result = recommend('dineout', baseCtx);
    expect(result.mode).toBe('dineout');
    expect(result.recipes).toHaveLength(0);
    expect(result.places).toHaveLength(3);
    for (const p of result.places) {
      expect(p.candidate.scene).toContain('dineout');
    }
  });

  it('商户推荐：结果按总分降序，breakdown 含 4 个 scorer', () => {
    const { places } = recommend('takeout', baseCtx);
    expect(places[0].totalScore).toBeGreaterThanOrEqual(places[1].totalScore);
    for (const p of places) {
      expect(p.breakdown).toHaveLength(4);
    }
  });

  it('换一批（recentEaten 硬过滤）：新 Top3 与上一批零交集', () => {
    const first = recommend('cook', baseCtx);
    const firstIds = first.recipes.map((r) => r.candidate.id);
    const second = recommend('cook', { ...baseCtx, recentEaten: firstIds });
    const secondIds = second.recipes.map((r) => r.candidate.id);
    expect(secondIds).toHaveLength(3);
    for (const id of secondIds) {
      expect(firstIds).not.toContain(id);
    }
  });

  it('recentEaten 覆盖几乎全部菜谱时回退不剔除，仍能返回 3 个结果', () => {
    const almostAll = RECIPES.slice(0, RECIPES.length - 2).map((r) => r.id); // 只剩 2 道没被吃
    const result = recommend('cook', { ...baseCtx, recentEaten: almostAll });
    expect(result.recipes).toHaveLength(3);
  });

  it('忌口硬过滤：dislikes 命中的菜不进 Top3', () => {
    const result = recommend('cook', { ...baseCtx, dislikes: ['香菜'] });
    expect(result.recipes).toHaveLength(3);
    for (const rec of result.recipes) {
      const hasCilantro = rec.candidate.ingredients.some((i) => i.name === '香菜');
      expect(hasCilantro).toBe(false);
    }
  });

  it('忌口命中常见食材（蒜）：Top3 全部不含该主食材', () => {
    const result = recommend('cook', { ...baseCtx, dislikes: ['蒜'] });
    expect(result.recipes).toHaveLength(3);
    for (const rec of result.recipes) {
      const hit = rec.candidate.ingredients
        .filter((i) => !isPantryStaple(i.name))
        .some((i) => ingredientHit('蒜', i.name));
      expect(hit).toBe(false);
    }
  });

  it('忌口剔除后不足 TopN 时回退保护，仍返回 3 个', () => {
    const allIngredients = [...new Set(RECIPES.flatMap((r) => r.ingredients.map((i) => i.name)))];
    const result = recommend('cook', { ...baseCtx, dislikes: allIngredients });
    expect(result.recipes).toHaveLength(3);
  });

  it('dislikes 为空数组 / undefined 时行为不变', () => {
    const a = recommend('cook', baseCtx).recipes.map((r) => r.candidate.id);
    const b = recommend('cook', { ...baseCtx, dislikes: [] }).recipes.map((r) => r.candidate.id);
    expect(b).toEqual(a);
  });

  it('冷天且食材匹配时，热乎的炖锅排到第一', () => {
    const coldCtx = makeCtx({
      ...baseCtx,
      ingredients: ['牛腩', '番茄', '洋葱', '姜'], // 番茄牛腩煲满配
      weather: makeWeather({ tempC: 2, condition: 'snowy' }),
      now: new Date(2026, 0, 15, 18), // 1 月晚餐时段
      mood: 'tired',
      availableMinutes: 120,
    });
    const { recipes } = recommend('cook', coldCtx);
    expect(recipes[0].candidate.name).toBe('番茄牛腩煲');
    expect(recipes[0].candidate.warmth).toBe('hot');
  });

  it('热天且食材都不匹配时，清爽凉菜占据 Top3（weatherFit 生效）', () => {
    const hot = recommend('cook', makeCtx({
      ingredients: [],
      weather: makeWeather({ tempC: 33 }),
      now: new Date(2026, 6, 15, 18), // 7 月晚餐时段
      mood: 'relaxed',
      availableMinutes: 60,
    }));
    expect(hot.recipes).toHaveLength(3);
    // 所有入选菜都应是 cool/cold/neutral，不应出现 hot 炖锅
    for (const r of hot.recipes) {
      expect(r.candidate.warmth).not.toBe('hot');
    }
    expect(hot.recipes.map((r) => r.candidate.name)).not.toContain('番茄牛腩煲');
  });
});

describe('Top3 荤素多样性约束（ensureMeatDiversity）', () => {
  function rec(id: string, course: Course, score: number): Recommendation<Recipe> {
    return { candidate: makeRecipe({ id, course }), totalScore: score, breakdown: [], summary: '' };
  }

  it('Top3 无 meat 且有 meat 候选：得分最低的非 meat 被最高分 meat 替换，结果仍降序', () => {
    const ranked = [
      rec('v1', 'veg', 0.9),
      rec('s1', 'staple', 0.8),
      rec('v2', 'veg', 0.7), // 最低分非 meat，应让位
      rec('m1', 'meat', 0.5), // 最高分 meat，应换入
      rec('m2', 'meat', 0.4),
    ];
    const top = ensureMeatDiversity(ranked, 3);
    expect(top.map((r) => r.candidate.id)).toEqual(['v1', 's1', 'm1']);
    expect(top[2].candidate.course).toBe('meat');
    for (let i = 0; i < top.length - 1; i++) {
      expect(top[i].totalScore).toBeGreaterThanOrEqual(top[i + 1].totalScore);
    }
  });

  it('Top3 已含 meat：原样返回，不做替换', () => {
    const ranked = [rec('v1', 'veg', 0.9), rec('m1', 'meat', 0.8), rec('s1', 'staple', 0.7), rec('m2', 'meat', 0.6)];
    const top = ensureMeatDiversity(ranked, 3);
    expect(top.map((r) => r.candidate.id)).toEqual(['v1', 'm1', 's1']);
  });

  it('候选中无 meat（meat 不足）：不强求，原样返回', () => {
    const ranked = [rec('v1', 'veg', 0.9), rec('s1', 'staple', 0.8), rec('v2', 'veg', 0.7)];
    const top = ensureMeatDiversity(ranked, 3);
    expect(top.map((r) => r.candidate.id)).toEqual(['v1', 's1', 'v2']);
  });

  it('集成：冰箱只有常见素食材时，推荐 Top3 至少 1 道 meat 主菜', () => {
    const result = recommend(
      'cook',
      makeCtx({ ingredients: ['生菜', '西兰花', '土豆', '胡萝卜', '黄瓜'], mood: 'relaxed' }),
    );
    expect(result.recipes).toHaveLength(3);
    expect(result.recipes.some((r) => r.candidate.course === 'meat')).toBe(true);
  });

  it('集成：替换进来的 meat 是全体候选中得分最高的 meat', () => {
    const ctx = makeCtx({ ingredients: ['生菜', '西兰花', '土豆'], mood: 'relaxed' });
    const result = recommend('cook', ctx);
    const meatInTop = result.recipes.find((r) => r.candidate.course === 'meat');
    expect(meatInTop).toBeTruthy();
    // 其余 meat 候选若再被推荐一次（剔除现有 Top3）都不应比它分高：
    // 直接对比全库 meat 在该 ctx 下的最高分（用 recentEaten 逼出其他 meat 验证）
    const others = recommend('cook', {
      ...ctx,
      recentEaten: [meatInTop!.candidate.id],
    }).recipes.filter((r) => r.candidate.course === 'meat');
    for (const o of others) {
      expect(o.totalScore).toBeLessThanOrEqual(meatInTop!.totalScore);
    }
  });
});

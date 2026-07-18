/**
 * 多样性：最近吃过的直接降为 0 分，避免连续推荐同一样。
 */
import type { Recipe, Scorer } from '../../types';

export const novelty: Scorer<Recipe> = {
  key: 'novelty',
  score(recipe, ctx) {
    if (ctx.recentEaten.includes(recipe.id)) {
      return { score: 0, reason: '最近刚吃过，先换换口味' };
    }
    return { score: 1, reason: '最近没吃过，有新鲜感' };
  },
};

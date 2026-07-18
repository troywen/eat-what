/**
 * 热度分：直接使用数据层给出的 trendScore（0~1）。
 */
import type { Recipe, Scorer } from '../../types';

export const trendFit: Scorer<Recipe> = {
  key: 'trendFit',
  score(recipe) {
    return {
      score: recipe.trendScore,
      reason: `最近热度 ${(recipe.trendScore * 100).toFixed(0)}%，大家都在吃`,
    };
  },
};

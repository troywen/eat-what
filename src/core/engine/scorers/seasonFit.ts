/**
 * 季节适配：当前月份在菜谱适宜月份内 → 1.0，否则 0.5。
 */
import type { Recipe, Scorer } from '../../types';

export const seasonFit: Scorer<Recipe> = {
  key: 'seasonFit',
  score(recipe, ctx) {
    const month = ctx.now.getMonth() + 1;
    if (recipe.seasonMonths.includes(month)) {
      return { score: 1.0, reason: `${month} 月正是吃它的好时候` };
    }
    return { score: 0.5, reason: `${month} 月吃它不算时令` };
  },
};

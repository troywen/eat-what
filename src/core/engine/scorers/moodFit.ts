/**
 * 心情适配：菜谱标记的心情包含当前心情 → 1.0，否则 0.4。
 */
import type { Mood, Recipe, Scorer } from '../../types';

export const MOOD_LABEL: Record<Mood, string> = {
  happy: '开心',
  tired: '疲惫',
  stressed: '压力大',
  blue: '有点丧',
  relaxed: '放松',
  adventurous: '想尝鲜',
};

export const moodFit: Scorer<Recipe> = {
  key: 'moodFit',
  score(recipe, ctx) {
    if (recipe.moods.includes(ctx.mood)) {
      return { score: 1.0, reason: `适合${MOOD_LABEL[ctx.mood]}的时候吃` };
    }
    return { score: 0.4, reason: `和${MOOD_LABEL[ctx.mood]}的心情不算绝配` };
  },
};

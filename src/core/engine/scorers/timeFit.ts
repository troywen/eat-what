/**
 * 时间适配：餐段匹配 + 烹饪时长不超过可用时间。
 * 不匹配当前餐段 → 0.2；超时 → 0.1 强降权；越省时越高分。
 */
import type { MealSlot, Recipe, Scorer } from '../../types';
import { getMealSlot } from '../../services/weather';

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  lateNight: '夜宵',
};

export const timeFit: Scorer<Recipe> = {
  key: 'timeFit',
  score(recipe, ctx) {
    const slot = getMealSlot(ctx.now);

    if (!recipe.mealSlots.includes(slot)) {
      return { score: 0.2, reason: `这道菜不太适合当${SLOT_LABEL[slot]}` };
    }
    if (recipe.cookMinutes > ctx.availableMinutes) {
      return {
        score: 0.1,
        reason: `要做 ${recipe.cookMinutes} 分钟，超过你有的 ${ctx.availableMinutes} 分钟`,
      };
    }

    const ratio = recipe.cookMinutes / ctx.availableMinutes;
    if (ratio <= 0.3) {
      return { score: 1.0, reason: `${recipe.cookMinutes} 分钟快手搞定，很省时` };
    }
    if (ratio <= 0.6) {
      return { score: 0.85, reason: `${recipe.cookMinutes} 分钟能上桌，时间充裕` };
    }
    return { score: 0.7, reason: `${recipe.cookMinutes} 分钟做得完，但有点紧` };
  },
};

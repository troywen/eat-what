/**
 * 口味偏好适配：tasteBias（0=超清淡，1=超重口，缺省 0.5）。
 * 重口侧偏好 spicy/salty/savory，清淡侧偏好 light/sour/sweet；
 * 0.5 附近（±0.05）全部中性 0.7；偏离越大，对味/不对味的分差越明显。
 */
import type { Recipe, Scorer, Taste } from '../../types';

const HEAVY_TASTES: Taste[] = ['spicy', 'salty', 'savory'];
const LIGHT_TASTES: Taste[] = ['light', 'sour', 'sweet'];
/** |bias - 0.5| ≤ 该值视为中性 */
const NEUTRAL_BAND = 0.05;
const BASE_SCORE = 0.7;
/** 极端偏离时的最大加减幅 */
const MAX_SWING = 0.3;

export const tasteFit: Scorer<Recipe> = {
  key: 'tasteFit',
  score(recipe, ctx) {
    const bias = ctx.tasteBias ?? 0.5;
    const deviation = bias - 0.5;

    if (Math.abs(deviation) <= NEUTRAL_BAND) {
      return { score: BASE_SCORE, reason: '口味不偏不倚，这道什么时候吃都行' };
    }

    const total = recipe.tastes.length || 1;
    const heavyCount = recipe.tastes.filter((t) => HEAVY_TASTES.includes(t)).length;
    const lightCount = recipe.tastes.filter((t) => LIGHT_TASTES.includes(t)).length;
    const heavyUser = deviation > 0;
    const match = (heavyUser ? heavyCount : lightCount) / total;
    const anti = (heavyUser ? lightCount : heavyCount) / total;
    const strength = Math.min(1, Math.abs(deviation) * 2);
    const score = Math.min(1, Math.max(0, BASE_SCORE + strength * MAX_SWING * (match - anti)));

    let reason: string;
    if (heavyUser) {
      reason = match >= anti ? '你想吃重口，这道菜正对味' : '你想吃重口，这道稍微清淡了点';
    } else {
      reason = match >= anti ? '清淡挂，这道菜不油腻' : '你想吃清淡，这道稍微重口了点';
    }
    return { score, reason };
  },
};

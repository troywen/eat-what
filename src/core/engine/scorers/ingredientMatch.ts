/**
 * 食材匹配度：区分主食材与常备调料（PANTRY）。
 * - 命中统计与缺料列表只计非 PANTRY 主食材（调料默认家里有）
 * - 打分：主料覆盖率 × 90% + 调料齐全度 × 10%（调料默认齐全 → 恒为 1）
 * 命中规则：双向包含匹配 + 常见别名匹配（如「鸡蛋」命中「蛋」）。
 */
import type { Recipe, Scorer } from '../../types';

/** 常见食材别名组：组内名字互为别名。 */
const ALIAS_GROUPS: string[][] = [
  ['鸡蛋', '蛋'],
  ['番茄', '西红柿'],
  ['土豆', '马铃薯'],
  ['红薯', '地瓜'],
  ['包菜', '圆白菜', '卷心菜'],
  ['大葱', '小葱', '香葱', '葱'],
  ['大蒜', '蒜头', '蒜'],
  ['生姜', '姜'],
  ['青椒', '尖椒'],
  ['豆腐', '嫩豆腐', '老豆腐'],
  ['香菜', '芫荽'],
  ['面条', '挂面', '鲜面条', '拉面'],
  ['大米', '米饭', '剩饭'],
  ['香肠', '腊肠', '火腿肠'],
  ['青菜', '菠菜', '生菜', '上海青', '油麦菜', '小白菜'],
  ['肥牛', '肥牛卷'],
];

/** 家庭常备调料：不计入主食材命中/缺料，默认视为家里有。 */
const PANTRY_STAPLES = [
  '盐', '白糖', '冰糖', '糖',
  '生抽', '老抽',
  '香醋', '陈醋', '醋',
  '香油', '食用油',
  '蚝油', '鸡精',
  '料酒', '淀粉',
  '胡椒粉', '胡椒', '十三香',
  '豆瓣酱', '豆豉',
  '花椒', '八角', '白芝麻',
  '清水', '温水',
];

function expandAliases(name: string): string[] {
  for (const group of ALIAS_GROUPS) {
    if (group.includes(name)) return group;
  }
  return [name];
}

/** 判断用户食材 userItem 是否命中所需食材 required（包含 + 别名）。 */
export function ingredientHit(userItem: string, required: string): boolean {
  if (!userItem || !required) return false;
  if (required.includes(userItem) || userItem.includes(required)) return true;
  const userAliases = expandAliases(userItem);
  const requiredAliases = expandAliases(required);
  return userAliases.some((a) => requiredAliases.some((b) => a === b));
}

/** 是否为常备调料（PANTRY）。 */
export function isPantryStaple(name: string): boolean {
  return PANTRY_STAPLES.some((s) => name.includes(s));
}

/** 缺料清单：只返回缺的非 PANTRY 主食材名（去重）。 */
export function missingIngredients(recipe: Recipe, have: string[]): string[] {
  const missing: string[] = [];
  for (const ing of recipe.ingredients) {
    if (isPantryStaple(ing.name)) continue;
    if (!have.some((u) => ingredientHit(u, ing.name))) {
      missing.push(ing.name);
    }
  }
  return [...new Set(missing)];
}

export const ingredientMatch: Scorer<Recipe> = {
  key: 'ingredientMatch',
  score(recipe, ctx) {
    const mains = recipe.ingredients.filter((i) => !isPantryStaple(i.name));
    const missing = missingIngredients(recipe, ctx.ingredients);
    const mainHits = mains.length - missing.length;
    const coverage = mains.length > 0 ? mainHits / mains.length : 1;

    // 调料默认齐全（齐全度恒为 1），主料覆盖率占 90%
    const score = 0.9 * coverage + 0.1;

    const reason =
      missing.length === 0
        ? `主食材齐全，${mains.length} 样家里都有`
        : `主食材命中 ${mainHits}/${mains.length}；还缺：${missing.join('、')}`;
    return { score, reason };
  },
};

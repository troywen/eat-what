/**
 * AI 菜谱生成服务（预留接口，Demo 阶段不接真服务）。
 *
 * 上线后走自家服务端代理调用 LLM（API Key 不下发前端）。
 * 任何 AI 生成的 Recipe 必须先经 validateRecipe() 运行时校验，
 * 字段不合法的一律丢弃，不得直接入库或进推荐候选。
 */
import type { MealSlot, Mood, Recipe, ScorerContext, Taste, Warmth } from '../types';

export interface AiRecipeService {
  /** 按当前上下文（食材/天气/心情/忌口…）生成菜谱候选。 */
  generate(ctx: ScorerContext): Promise<Recipe[]>;
}

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'lateNight'];
const TASTES: Taste[] = ['spicy', 'sweet', 'sour', 'salty', 'light', 'savory'];
const WARMTHS: Warmth[] = ['hot', 'warm', 'neutral', 'cool', 'cold'];
const MOODS: Mood[] = ['happy', 'tired', 'stressed', 'blue', 'relaxed', 'adventurous'];
const COURSES = ['meat', 'veg', 'staple', 'soup'];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isSubsetStringArray(v: unknown, allowed: readonly string[], nonEmpty: boolean): boolean {
  if (!Array.isArray(v)) return false;
  if (nonEmpty && v.length === 0) return false;
  return v.every((x) => typeof x === 'string' && allowed.includes(x));
}

/**
 * 运行时校验：unknown → Recipe 类型守卫。
 * 检查所有必填字段类型、steps≥4、seasonMonths⊂1-12、course 合法等入库门槛。
 */
export function validateRecipe(r: unknown): r is Recipe {
  if (typeof r !== 'object' || r === null) return false;
  const o = r as Record<string, unknown>;

  if (!isNonEmptyString(o.id)) return false;
  if (!isNonEmptyString(o.name)) return false;
  if (!isNonEmptyString(o.description)) return false;
  if (typeof o.course !== 'string' || !COURSES.includes(o.course)) return false;

  if (!Array.isArray(o.ingredients) || o.ingredients.length === 0) return false;
  for (const ing of o.ingredients) {
    if (typeof ing !== 'object' || ing === null) return false;
    const i = ing as Record<string, unknown>;
    if (!isNonEmptyString(i.name) || !isNonEmptyString(i.amount)) return false;
  }

  if (!Array.isArray(o.steps) || o.steps.length < 4) return false;
  if (!o.steps.every((s) => isNonEmptyString(s))) return false;

  if (typeof o.cookMinutes !== 'number' || !Number.isFinite(o.cookMinutes) || o.cookMinutes <= 0) return false;
  if (o.difficulty !== 1 && o.difficulty !== 2 && o.difficulty !== 3) return false;

  if (!isSubsetStringArray(o.mealSlots, MEAL_SLOTS, true)) return false;
  if (!isSubsetStringArray(o.tastes, TASTES, true)) return false;
  if (typeof o.warmth !== 'string' || !WARMTHS.includes(o.warmth as Warmth)) return false;
  if (!isSubsetStringArray(o.moods, MOODS, true)) return false;

  if (!Array.isArray(o.seasonMonths) || o.seasonMonths.length === 0) return false;
  if (!o.seasonMonths.every((m) => Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12)) return false;

  if (typeof o.trendScore !== 'number' || !Number.isFinite(o.trendScore)) return false;
  if (!isNonEmptyString(o.videoKeyword)) return false;
  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === 'string')) return false;

  if (o.servings !== undefined) {
    if (typeof o.servings !== 'number' || !Number.isFinite(o.servings) || o.servings < 1) return false;
  }

  return true;
}

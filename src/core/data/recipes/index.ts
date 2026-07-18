/**
 * 菜谱数据层（Demo 内置数据，生产可替换为数据库 + Repository 接口）。
 * 按 course + 场景分文件维护：breakfast / meat / veg / staple / soup / lateNight。
 * 每道菜含精确用量、分步做法、烹饪时长与全套打分标签。
 * 对外导出与排序（按 id 升序）保持稳定，import 方零改动。
 */
import type { Recipe } from '../../types';
import { BREAKFAST_RECIPES } from './breakfast';
import { MEAT_RECIPES } from './meat';
import { VEG_RECIPES } from './veg';
import { STAPLE_RECIPES } from './staple';
import { SOUP_RECIPES } from './soup';
import { LATE_NIGHT_RECIPES } from './lateNight';

export const RECIPES: Recipe[] = [
  ...BREAKFAST_RECIPES,
  ...MEAT_RECIPES,
  ...VEG_RECIPES,
  ...STAPLE_RECIPES,
  ...SOUP_RECIPES,
  ...LATE_NIGHT_RECIPES,
].sort((a, b) => a.id.localeCompare(b.id));

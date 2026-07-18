/**
 * 推荐引擎权重配置 —— 全局唯一调参入口（见 ARCHITECTURE.md §7）。
 * 约束：每组权重之和必须为 1（加载时断言 + 单测双重保证）。
 */

export const RECIPE_WEIGHTS: Record<string, number> = {
  ingredientMatch: 0.32,
  timeFit: 0.2,
  weatherFit: 0.15,
  moodFit: 0.12,
  tasteFit: 0.08,
  seasonFit: 0.08,
  trendFit: 0.04,
  novelty: 0.01,
};

export const PLACE_WEIGHTS: Record<string, number> = {
  placeTrend: 0.3,
  distanceFit: 0.25,
  placeSeason: 0.25,
  placeMood: 0.2,
};

/** 运行时断言：权重和必须为 1（容忍浮点误差）。 */
export function validateWeights(weights: Record<string, number>, label = 'weights'): void {
  const sum = Object.values(weights).reduce((acc, w) => acc + w, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`${label} 权重之和必须为 1，当前为 ${sum}`);
  }
}

validateWeights(RECIPE_WEIGHTS, 'RECIPE_WEIGHTS');
validateWeights(PLACE_WEIGHTS, 'PLACE_WEIGHTS');

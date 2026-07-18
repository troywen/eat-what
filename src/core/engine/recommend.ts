/**
 * 推荐入口：按模式路由到对应候选集与权重管道，默认返回 Top 3（topN 可覆盖）。
 * cook → 菜谱管道；takeout/dineout → 商户管道（按 scene 过滤）。
 * topN 传大值（如 PLACES.length）可拿全量排序结果，供菜系过滤等场景二次裁剪。
 *
 * 硬过滤（管道前）：
 * - recentEaten：剔除最近吃过的候选（「换一批」不再重现）；剔除后不足 TopN 则回退不剔除
 * - dislikes（仅 cook）：菜谱任一非 PANTRY 食材命中忌口即剔除；同样带回退
 */
import type {
  CookMode,
  PlaceCandidate,
  Recommendation,
  RecommendResult,
  Recipe,
  Scorer,
  ScorerContext,
} from '../types';
import { RECIPES } from '../data/recipes';
import { PLACES } from '../data/places';
import { runPipeline } from './pipeline';
import { PLACE_WEIGHTS, RECIPE_WEIGHTS } from './weights';
import { ingredientHit, ingredientMatch, isPantryStaple } from './scorers/ingredientMatch';
import { weatherFit } from './scorers/weatherFit';
import { timeFit } from './scorers/timeFit';
import { moodFit } from './scorers/moodFit';
import { tasteFit } from './scorers/tasteFit';
import { seasonFit } from './scorers/seasonFit';
import { trendFit } from './scorers/trendFit';
import { novelty } from './scorers/novelty';
import { distanceFit, placeMood, placeSeason, placeTrend } from './scorers/placeScorers';

const RECIPE_SCORERS: Scorer<Recipe>[] = [
  ingredientMatch,
  weatherFit,
  timeFit,
  moodFit,
  tasteFit,
  seasonFit,
  trendFit,
  novelty,
];

const PLACE_SCORERS: Scorer<PlaceCandidate>[] = [
  distanceFit,
  placeTrend,
  placeSeason,
  placeMood,
];

const TOP_N = 3;

/**
 * Top3 荤素多样性约束（注意：这是多样性约束，不是打分，不改任何 totalScore）。
 * 排完序取 Top3 时，若候选中存在 meat 菜但 Top3 里没有，
 * 用得分最高的 meat 菜替换 Top3 中得分最低的非 meat 菜，保证至少 1 道肉菜主菜；
 * meat 候选不足（连 1 道都没有）时不强求。
 */
function ensureMeatDiversity(ranked: Recommendation<Recipe>[], topN: number): Recommendation<Recipe>[] {
  const top = ranked.slice(0, topN);
  if (top.some((r) => r.candidate.course === 'meat')) return top;
  const bestMeat = ranked.find((r) => r.candidate.course === 'meat');
  if (!bestMeat) return top; // 候选里根本没有 meat，不强求
  // Top3 中得分最低的非 meat 菜让位
  top[top.length - 1] = bestMeat;
  return [...top].sort((a, b) => b.totalScore - a.totalScore);
}

/** 导出供单测：Top3 荤素多样性约束（语义见函数注释）。 */
export { ensureMeatDiversity };

function filterRecipes(recipes: Recipe[], ctx: ScorerContext): Recipe[] {
  let filtered = recipes;

  // 硬过滤 1：最近吃过
  if (ctx.recentEaten.length > 0) {
    const f = filtered.filter((r) => !ctx.recentEaten.includes(r.id));
    if (f.length >= TOP_N) filtered = f;
  }

  // 硬过滤 2：忌口（任一非 PANTRY 食材命中即剔除）
  const dislikes = ctx.dislikes ?? [];
  if (dislikes.length > 0) {
    const f = filtered.filter(
      (r) =>
        !r.ingredients.some(
          (ing) => !isPantryStaple(ing.name) && dislikes.some((d) => ingredientHit(d, ing.name)),
        ),
    );
    if (f.length >= TOP_N) filtered = f;
  }

  return filtered;
}

function filterPlaces(places: PlaceCandidate[], ctx: ScorerContext): PlaceCandidate[] {
  if (ctx.recentEaten.length === 0) return places;
  const f = places.filter((p) => !ctx.recentEaten.includes(p.id));
  return f.length >= TOP_N ? f : places;
}

export function recommend(mode: CookMode, ctx: ScorerContext, topN: number = TOP_N): RecommendResult {
  if (mode === 'cook') {
    const candidates = filterRecipes(RECIPES, ctx);
    // 全量排序后先做荤素多样性约束，再截 TopN（约束在排序之外，见 ensureMeatDiversity）
    const ranked = runPipeline(candidates, RECIPE_SCORERS, RECIPE_WEIGHTS, ctx, candidates.length);
    return {
      mode,
      recipes: ensureMeatDiversity(ranked, topN),
      places: [],
    };
  }

  const scene: 'takeout' | 'dineout' = mode;
  const candidates = filterPlaces(
    PLACES.filter((p) => p.scene.includes(scene)),
    ctx,
  );
  return {
    mode,
    recipes: [],
    places: runPipeline(candidates, PLACE_SCORERS, PLACE_WEIGHTS, ctx, topN),
  };
}

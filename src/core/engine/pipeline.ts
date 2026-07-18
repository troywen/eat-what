/**
 * 打分器管道：对候选集执行所有 Scorer，加权求和 → 排序取 TopN。
 * 新增打分维度只需新增 scorer 并配权重，管道本身不改动（开闭原则）。
 */
import type { Recommendation, ScoreBreakdown, Scorer, ScorerContext } from '../types';

export function runPipeline<T>(
  candidates: T[],
  scorers: Scorer<T>[],
  weights: Record<string, number>,
  ctx: ScorerContext,
  topN: number,
): Recommendation<T>[] {
  const weightSum = Object.values(weights).reduce((acc, w) => acc + w, 0);
  if (weightSum <= 0) {
    throw new Error('runPipeline: 权重之和必须大于 0');
  }

  const recommendations = candidates.map((candidate) => {
    const breakdown: ScoreBreakdown[] = scorers.map((scorer) => {
      const rawWeight = weights[scorer.key] ?? 0;
      const weight = rawWeight / weightSum; // 归一化，允许传入非归一权重
      const result = scorer.score(candidate, ctx);
      const rawScore = Math.min(1, Math.max(0, result.score));
      return {
        scorerKey: scorer.key,
        weight,
        rawScore,
        weightedScore: weight * rawScore,
        reason: result.reason,
      };
    });
    const totalScore = breakdown.reduce((acc, b) => acc + b.weightedScore, 0);
    return { candidate, totalScore, breakdown, summary: buildSummary(breakdown) };
  });

  recommendations.sort((a, b) => b.totalScore - a.totalScore);
  return recommendations.slice(0, topN);
}

/** 取权重最高且带理由的两项，拼接为人类可读推荐摘要。 */
function buildSummary(breakdown: ScoreBreakdown[]): string {
  return breakdown
    .filter((b) => b.weight > 0 && typeof b.reason === 'string' && b.reason.length > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((b) => b.reason as string)
    .join('；');
}

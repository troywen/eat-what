/**
 * 菜系过滤：作用在 recommend 的商户排序结果上（纯函数，便于测试）。
 * 注意：调用方须先以足够大的 topN 拿全量排序，再交给本函数裁剪，
 * 否则目标菜系排不进 Top3 时会被误判为「未收录」。
 */
import type { PlaceCandidate, Recommendation } from '../core/types'
import { matchCuisine } from './cuisines'

export interface CuisineFilterResult {
  list: Recommendation<PlaceCandidate>[]
  /** filtered=命中已过滤；fallback=未收录该菜系，展示原列表；null=未选菜系 */
  note: 'filtered' | 'fallback' | null
}

export function filterPlacesByCuisine(
  recs: Recommendation<PlaceCandidate>[],
  cuisine: string | null,
  limit = 3,
): CuisineFilterResult {
  if (!cuisine) return { list: recs, note: null }
  const hits = recs.filter((r) => matchCuisine(r.candidate, cuisine))
  if (hits.length > 0) {
    return { list: hits.slice(0, limit), note: 'filtered' } // 有几家展示几家，不凑数
  }
  return { list: recs.slice(0, limit), note: 'fallback' }
}

/**
 * 「我想吃 X」直接搜索：在菜谱（菜名/食材/标签）与商户（名称/品类/招牌菜）里找匹配。
 * 纯函数，零 React 依赖。
 * 命中优先级：菜谱 名字 > 食材 > 标签；商户 名字 > 品类 > 招牌菜。
 */
import type { PlaceCandidate, Recipe } from '../core/types'

export interface DishSearchHit {
  kind: 'recipe' | 'place'
  id: string
  /** 菜名 / 店名 */
  title: string
  /** 辅助说明（标签、品类等；招牌菜命中时会带上「招牌 X」） */
  subtitle: string
}

export interface GroupedDishSearchHits {
  recipes: DishSearchHit[]
  places: DishSearchHit[]
}

export function searchDishes(
  query: string,
  recipes: Recipe[],
  places: PlaceCandidate[],
  limit = 5,
): DishSearchHit[] {
  const q = query.trim()
  if (!q) return []

  const hits: { hit: DishSearchHit; rank: number }[] = []

  for (const r of recipes) {
    let rank = 0
    if (r.name.includes(q)) rank = 3
    else if (r.ingredients.some((i) => i.name.includes(q))) rank = 2
    else if (r.tags.some((t) => t.includes(q))) rank = 1
    if (rank > 0) {
      hits.push({
        rank,
        hit: { kind: 'recipe', id: r.id, title: r.name, subtitle: r.tags.join(' · ') },
      })
    }
  }

  for (const p of places) {
    let rank = 0
    if (p.name.includes(q)) rank = 3
    else if (p.category.includes(q)) rank = 2
    else if (p.signatureDishes?.some((d) => d.includes(q))) rank = 1
    if (rank > 0) {
      // 招牌菜命中时把命中的招牌亮出来，解释「为什么是这家店」
      const signature = rank === 1 ? p.signatureDishes?.find((d) => d.includes(q)) : undefined
      hits.push({
        rank,
        hit: {
          kind: 'place',
          id: p.id,
          title: p.name,
          subtitle: signature
            ? `${p.category} · 招牌 ${signature} · 人均 ¥${p.perCapita}`
            : `${p.category} · 人均 ¥${p.perCapita}`,
        },
      })
    }
  }

  // rank 高的在前；同 rank 保持数据原顺序（sort 稳定）
  return hits
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((h) => h.hit)
}

/** 下拉分组：🍳 菜谱在前，🏪 商户在后；组内保持 rank 排序（filter 保序）。 */
export function groupSearchHits(hits: DishSearchHit[]): GroupedDishSearchHits {
  return {
    recipes: hits.filter((h) => h.kind === 'recipe'),
    places: hits.filter((h) => h.kind === 'place'),
  }
}

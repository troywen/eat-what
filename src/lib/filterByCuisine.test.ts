import { describe, expect, it } from 'vitest'
import { filterPlacesByCuisine } from './filterByCuisine'
import { recommend } from '../core/engine/recommend'
import { PLACES } from '../core/data/places'
import { makeCtx } from '../core/engine/__tests__/helpers'

/** 全量 dineout 排序结果（模拟 App 修复后的调用方式：先全量再过滤） */
function allDineoutRanked() {
  return recommend('dineout', makeCtx(), PLACES.length).places
}

describe('filterPlacesByCuisine', () => {
  it('cuisine 为 null：原样返回，note 为 null', () => {
    const recs = allDineoutRanked()
    const { list, note } = filterPlacesByCuisine(recs, null)
    expect(list).toBe(recs)
    expect(note).toBeNull()
  })

  it('火锅：过滤结果每家都命中火锅，且 note=filtered', () => {
    const { list, note } = filterPlacesByCuisine(allDineoutRanked(), '火锅')
    expect(note).toBe('filtered')
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list.length).toBeLessThanOrEqual(3)
    for (const r of list) {
      expect(`${r.candidate.name} ${r.candidate.category}`).toMatch(/火锅|牛肉锅|椰子鸡/)
    }
  })

  it('西餐：过滤后全部是西餐商户（修复「转西餐推日料火锅」的回归断言）', () => {
    const { list, note } = filterPlacesByCuisine(allDineoutRanked(), '西餐')
    expect(note).toBe('filtered')
    expect(list.length).toBeGreaterThanOrEqual(1)
    const names = list.map((r) => r.candidate.name)
    for (const n of names) {
      expect(n).toMatch(/麦当劳|绿野轻食/)
    }
    // 不应混入日料/火锅
    expect(names.join()).not.toMatch(/寿司|刺身|火锅/)
  })

  it('超过 limit 的菜系只取前 limit 个，不凑数', () => {
    const { list } = filterPlacesByCuisine(allDineoutRanked(), '火锅', 2)
    expect(list).toHaveLength(2)
    // 只有 1 家命中的菜系给 1 家，不拿别的凑
    const one = filterPlacesByCuisine(allDineoutRanked(), '烧烤')
    expect(one.list).toHaveLength(1)
    expect(one.note).toBe('filtered')
  })

  it('粤菜/湘菜/韩餐补齐后：过滤命中且每家都属对应菜系', () => {
    const ranked = allDineoutRanked()
    for (const cuisine of ['粤菜', '湘菜', '韩餐']) {
      const { list, note } = filterPlacesByCuisine(ranked, cuisine)
      expect(note, cuisine).toBe('filtered')
      expect(list.length, cuisine).toBeGreaterThanOrEqual(1)
      for (const r of list) {
        expect(`${r.candidate.name} ${r.candidate.category}`).toMatch(/粤菜|早茶|点心|茶餐厅|烧腊|湘菜|剁椒|臭豆腐|韩餐|韩式|部队锅|石锅/)
      }
    }
  })

  it('命中商户被 recentEaten 剔除后走 fallback：返回原列表前 limit', () => {
    // 把粤菜全部标记为「最近吃过」→ 粤菜过滤 0 命中 → fallback
    const ctx = makeCtx({ recentEaten: ['p018', 'p019', 'p020'] })
    const ranked = recommend('dineout', ctx, PLACES.length).places
    const { list, note } = filterPlacesByCuisine(ranked, '粤菜')
    expect(note).toBe('fallback')
    expect(list).toEqual(ranked.slice(0, 3))
  })

  it('Top3 截断输入下也能工作（防御：不再有全量时的行为）', () => {
    const top3 = recommend('dineout', makeCtx()).places
    const { list, note } = filterPlacesByCuisine(top3, '川菜')
    // Top3 里若有川菜则 filtered，否则 fallback——两种都合法，只断言结构
    expect(['filtered', 'fallback']).toContain(note)
    expect(list.length).toBeGreaterThanOrEqual(1)
  })
})

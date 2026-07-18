import { describe, expect, it } from 'vitest'
import { groupSearchHits, searchDishes } from './dishSearch'
import { RECIPES } from '../core/data/recipes'
import { PLACES } from '../core/data/places'

describe('searchDishes', () => {
  it('空查询 / 纯空格返回空', () => {
    expect(searchDishes('', RECIPES, PLACES)).toEqual([])
    expect(searchDishes('   ', RECIPES, PLACES)).toEqual([])
  })

  it('按菜名命中菜谱：「番茄」命中番茄鸡蛋面等多道', () => {
    const hits = searchDishes('番茄', RECIPES, PLACES)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.kind === 'recipe' && h.title === '番茄鸡蛋面')).toBe(true)
    expect(hits.every((h) => h.kind === 'recipe')).toBe(true)
  })

  it('按食材名命中：「腊肠」命中腊肠炒饭', () => {
    const hits = searchDishes('腊肠', RECIPES, PLACES)
    expect(hits.some((h) => h.kind === 'recipe' && h.id === 'r031')).toBe(true)
  })

  it('按品类命中商户：「火锅」命中火锅店', () => {
    const hits = searchDishes('火锅', RECIPES, PLACES)
    expect(hits.some((h) => h.kind === 'place')).toBe(true)
  })

  it('按招牌菜命中商户：「酸菜鱼」命中眉州东坡', () => {
    const hits = searchDishes('酸菜鱼', RECIPES, PLACES)
    // 菜谱照常命中
    expect(hits.some((h) => h.kind === 'recipe' && h.id === 'r097')).toBe(true)
    // 商户靠招牌菜命中，且 subtitle 亮出招牌
    const place = hits.find((h) => h.kind === 'place')
    expect(place?.id).toBe('p003')
    expect(place?.subtitle).toContain('招牌 酸菜鱼')
  })

  it('「火锅」命中多家火锅店：名字 / 品类 / 招牌三路召回', () => {
    const ids = searchDishes('火锅', RECIPES, PLACES, 20)
      .filter((h) => h.kind === 'place')
      .map((h) => h.id)
    expect(ids).toContain('p001') // 海底捞火锅（名字）
    expect(ids).toContain('p002') // 重庆老灶火锅（名字）
    expect(ids).toContain('p012') // 八合里潮汕牛肉火锅（名字）
    expect(ids).toContain('p015') // 润园四季椰子鸡（品类「椰子鸡火锅」）
    expect(ids).toContain('p024') // 首尔部队锅（招牌「韩式火锅」）
  })

  it('商户排序：名字命中 > 品类命中 > 招牌菜命中', () => {
    // 「拉面」：味千（名字 rank3）> 马记 / 部队锅（招牌 rank1，按数据序）
    const lamian = searchDishes('拉面', RECIPES, PLACES, 20)
    expect(lamian.map((h) => h.id)).toEqual(['p009', 'p008', 'p024'])

    // 「火锅」：名字命中的三家 > 品类命中的 p015 > 招牌命中的 p024
    const ids = searchDishes('火锅', RECIPES, PLACES, 20)
      .filter((h) => h.kind === 'place')
      .map((h) => h.id)
    for (const nameHit of ['p001', 'p002', 'p012']) {
      expect(ids.indexOf(nameHit)).toBeLessThan(ids.indexOf('p015'))
    }
    expect(ids.indexOf('p015')).toBeLessThan(ids.indexOf('p024'))
  })

  it('名字命中排在食材命中前面', () => {
    const hits = searchDishes('蒸蛋羹', RECIPES, PLACES)
    expect(hits[0]?.id).toBe('r029')
  })

  it('最多返回 5 条', () => {
    const hits = searchDishes('鸡', RECIPES, PLACES)
    expect(hits.length).toBeLessThanOrEqual(5)
  })

  it('无结果返回空数组', () => {
    expect(searchDishes('佛跳墙炖宇宙', RECIPES, PLACES)).toEqual([])
  })
})

describe('groupSearchHits 下拉分组', () => {
  it('菜谱组与商户组分开，组内保持排序', () => {
    const groups = groupSearchHits(searchDishes('酸菜鱼', RECIPES, PLACES))
    expect(groups.recipes.map((h) => h.id)).toEqual(['r097'])
    expect(groups.places.map((h) => h.id)).toEqual(['p003'])
  })

  it('只命中一种时另一组为空：「蒸蛋羹」只有菜谱，「烤鱼」只有商户', () => {
    const onlyRecipes = groupSearchHits(searchDishes('蒸蛋羹', RECIPES, PLACES))
    expect(onlyRecipes.recipes.length).toBeGreaterThan(0)
    expect(onlyRecipes.places).toEqual([])

    const onlyPlaces = groupSearchHits(searchDishes('烤鱼', RECIPES, PLACES))
    expect(onlyPlaces.recipes).toEqual([])
    expect(onlyPlaces.places.map((h) => h.id)).toEqual(['p017'])
  })
})

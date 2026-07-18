import { describe, expect, it } from 'vitest'
import { CUISINES, matchCuisine } from './cuisines'
import { PLACES } from '../core/data/places'
import type { PlaceCandidate } from '../core/types'

function makePlace(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return {
    id: 'px',
    name: '测试店',
    category: '测试品类',
    perCapita: 50,
    distanceKm: 1,
    trendScore: 0.5,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    moods: ['relaxed'],
    scene: ['dineout'],
    source: 'hot',
    reason: '',
    ...overrides,
  }
}

describe('cuisines 数据', () => {
  it('共 12 个菜系，各配 emoji 与关键词', () => {
    expect(CUISINES).toHaveLength(12)
    for (const c of CUISINES) {
      expect(c.name).toBeTruthy()
      expect(c.emoji).toBeTruthy()
      expect(c.keywords.length).toBeGreaterThan(0)
    }
  })
})

describe('matchCuisine 覆盖核对', () => {
  it('PLACES 全部 25 家每家至少命中 1 个菜系', () => {
    expect(PLACES).toHaveLength(25)
    for (const p of PLACES) {
      const hits = CUISINES.filter((c) => matchCuisine(p, c.name)).map((c) => c.name)
      expect(hits.length, `${p.name}（${p.category}）未命中任何菜系`).toBeGreaterThanOrEqual(1)
    }
  })

  it('新增 8 家（粤菜×3/湘菜×3/韩餐×2）每家命中对应菜系', () => {
    const expected: Record<string, string> = {
      p018: '粤菜', // 点都德
      p019: '粤菜', // 烧腊饭
      p020: '粤菜', // 潮汕砂锅粥
      p021: '湘菜', // 费大厨
      p022: '湘菜', // 湘味小馆
      p023: '湘菜', // 臭豆腐
      p024: '韩餐', // 部队锅
      p025: '韩餐', // 石锅拌饭
    }
    for (const [id, cuisine] of Object.entries(expected)) {
      const p = PLACES.find((x) => x.id === id)!
      expect(p, id).toBeTruthy()
      expect(matchCuisine(p, cuisine), `${p.name} 应命中 ${cuisine}`).toBe(true)
    }
    // 三个原空白菜系现在都有真实命中
    for (const cuisine of ['粤菜', '湘菜', '韩餐']) {
      expect(PLACES.some((p) => matchCuisine(p, cuisine)), cuisine).toBe(true)
    }
  })

  it('代表性映射：麻辣烫/火锅/面馆/奶茶/大排档各归其位', () => {
    const byName = (n: string) => PLACES.find((p) => p.name.includes(n))!
    expect(matchCuisine(byName('杨国福'), '川菜')).toBe(true)
    expect(matchCuisine(byName('海底捞'), '火锅')).toBe(true)
    expect(matchCuisine(byName('八合里'), '火锅')).toBe(true)
    expect(matchCuisine(byName('味千'), '面馆')).toBe(true)
    expect(matchCuisine(byName('蜜雪'), '奶茶甜品')).toBe(true)
    expect(matchCuisine(byName('老码头'), '夜宵大排档')).toBe(true)
    expect(matchCuisine(byName('串烧'), '烧烤')).toBe(true)
    expect(matchCuisine(byName('村上一屋'), '日料')).toBe(true)
  })

  it('误命中检查：川菜馆不算火锅，奶茶店不算面馆', () => {
    const byName = (n: string) => PLACES.find((p) => p.name.includes(n))!
    expect(matchCuisine(byName('眉州东坡'), '火锅')).toBe(false)
    expect(matchCuisine(byName('喜茶'), '面馆')).toBe(false)
    expect(matchCuisine(byName('老乡鸡'), '烧烤')).toBe(false)
  })

  it('关键词收紧回归：意大利面不算面馆，茶餐厅不算奶茶甜品', () => {
    const pasta = makePlace({ name: '意面工坊', category: '意大利面' })
    expect(matchCuisine(pasta, '面馆')).toBe(false)
    expect(matchCuisine(pasta, '西餐')).toBe(true) // 「意面」归西餐
    const teahouse = makePlace({ name: '翠华茶餐厅', category: '茶餐厅' })
    expect(matchCuisine(teahouse, '奶茶甜品')).toBe(false)
    expect(matchCuisine(teahouse, '粤菜')).toBe(true) // 茶餐厅归粤菜
  })

  it('关键词收紧后原有命中不丢：牛肉面/拉面/奶茶/冰城仍命中', () => {
    const byName = (n: string) => PLACES.find((p) => p.name.includes(n))!
    expect(matchCuisine(byName('马记'), '面馆')).toBe(true)
    expect(matchCuisine(byName('味千'), '面馆')).toBe(true)
    expect(matchCuisine(byName('喜茶'), '奶茶甜品')).toBe(true)
    expect(matchCuisine(byName('蜜雪'), '奶茶甜品')).toBe(true)
  })

  it('未收录菜系（粤菜/湘菜/韩餐/西餐）映射表可用：合成商户能命中', () => {
    expect(matchCuisine(makePlace({ name: '翠园酒家', category: '粤菜' }), '粤菜')).toBe(true)
    expect(matchCuisine(makePlace({ name: '毛家饭店', category: '湘菜馆' }), '湘菜')).toBe(true)
    expect(matchCuisine(makePlace({ name: '首尔家', category: '韩式料理' }), '韩餐')).toBe(true)
    expect(matchCuisine(makePlace({ name: '萨莉亚', category: '意面披萨' }), '西餐')).toBe(true)
  })

  it('未知菜系名 / 完全不搭的商户返回 false', () => {
    const p = makePlace({ name: '沙县小吃', category: '小吃' })
    expect(matchCuisine(p, '不存在的菜系')).toBe(false)
    expect(matchCuisine(p, '日料')).toBe(false)
    expect(matchCuisine(p, '小吃快餐')).toBe(true)
  })
})

describe('PLACES 招牌菜数据', () => {
  it('全部 25 家 signatureDishes 非空且无空白项', () => {
    expect(PLACES).toHaveLength(25)
    for (const p of PLACES) {
      expect(p.signatureDishes, `${p.name} 缺 signatureDishes`).toBeDefined()
      expect(p.signatureDishes!.length, `${p.name} 招牌菜为空`).toBeGreaterThan(0)
      for (const d of p.signatureDishes!) {
        expect(d.trim(), `${p.name} 存在空白招牌菜`).toBeTruthy()
      }
    }
  })
})

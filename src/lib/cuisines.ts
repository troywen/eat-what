/**
 * 菜系转盘数据：12 个菜系 + 商户 → 菜系的关键词映射。
 * 映射按 place.name + category 双向包含匹配；一家商户可命中多个菜系。
 */
import type { PlaceCandidate } from '../core/types'

export interface Cuisine {
  name: string
  emoji: string
  /** 命中关键词（对 name+category 做子串匹配） */
  keywords: string[]
}

export const CUISINES: Cuisine[] = [
  { name: '川菜', emoji: '🌶️', keywords: ['川菜', '麻辣烫', '烤鱼', '冒菜', '回锅肉'] },
  { name: '粤菜', emoji: '🦐', keywords: ['粤菜', '茶餐厅', '烧腊', '早茶', '点心'] },
  { name: '湘菜', emoji: '🧄', keywords: ['湘菜', '剁椒', '臭豆腐'] },
  { name: '火锅', emoji: '🍲', keywords: ['火锅', '牛肉锅', '椰子鸡'] },
  { name: '烧烤', emoji: '🍢', keywords: ['烧烤', '烤串', '烤肉', '串烧'] },
  { name: '日料', emoji: '🍣', keywords: ['日料', '寿司', '刺身', '日式'] },
  { name: '韩餐', emoji: '🥘', keywords: ['韩餐', '韩式', '部队锅', '石锅'] },
  { name: '西餐', emoji: '🍝', keywords: ['西餐', '牛排', '意面', '披萨', '汉堡', '西式', '轻食', '沙拉'] },
  { name: '面馆', emoji: '🍜', keywords: ['面馆', '拉面', '牛肉面', '拌面', '汤面', '炒面', '冷面'] },
  { name: '小吃快餐', emoji: '🍟', keywords: ['小吃', '快餐'] },
  { name: '奶茶甜品', emoji: '🧋', keywords: ['奶茶', '果茶', '冰城', '甜品', '茶饮'] },
  { name: '夜宵大排档', emoji: '🌙', keywords: ['大排档', '夜宵'] },
]

/** 商户是否属于某菜系：name + category 命中该菜系任一关键词。 */
export function matchCuisine(place: PlaceCandidate, cuisine: string): boolean {
  const c = CUISINES.find((x) => x.name === cuisine)
  if (!c) return false
  const haystack = `${place.name} ${place.category}`
  return c.keywords.some((k) => haystack.includes(k))
}

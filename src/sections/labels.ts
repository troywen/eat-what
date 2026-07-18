import type { CookMode, MealSlot, Mood, PlaceCandidate, WeatherCondition } from '../core/types'

export const MODE_OPTIONS: { value: CookMode; label: string; emoji: string; hint: string }[] = [
  { value: 'cook', label: '自己做饭', emoji: '🍳', hint: '用现有食材做一顿' },
  { value: 'takeout', label: '点外卖', emoji: '🛵', hint: '最快送到嘴边' },
  { value: 'dineout', label: '外出吃', emoji: '🥢', hint: '出门换换心情' },
]

export const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'happy', label: '开心', emoji: '😄' },
  { value: 'tired', label: '疲惫', emoji: '😮‍💨' },
  { value: 'stressed', label: '压力大', emoji: '😣' },
  { value: 'blue', label: '有点丧', emoji: '😔' },
  { value: 'relaxed', label: '悠闲', emoji: '😌' },
  { value: 'adventurous', label: '想尝鲜', emoji: '🤩' },
]

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  lateNight: '夜宵',
}

export const CONDITION_META: Record<WeatherCondition, { label: string; emoji: string }> = {
  sunny: { label: '晴天', emoji: '☀️' },
  cloudy: { label: '多云', emoji: '☁️' },
  rainy: { label: '下雨', emoji: '🌧️' },
  snowy: { label: '下雪', emoji: '❄️' },
}

export const SOURCE_META: Record<PlaceCandidate['source'], { label: string; className: string }> = {
  'amap-rank': { label: '高德扫街榜', className: 'bg-orange-200/80 text-orange-900 border-orange-300' },
  hot: { label: '近期热门', className: 'bg-[#D9500B]/10 text-[#D9500B] border-[#D9500B]/30' },
  seasonal: { label: '时令推荐', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
}

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = {
  1: '简单',
  2: '中等',
  3: '硬菜',
}

export const SCORER_LABEL: Record<string, string> = {
  ingredientMatch: '食材匹配',
  weatherFit: '天气适配',
  timeFit: '时间适配',
  moodFit: '心情适配',
  seasonFit: '时令适配',
  trendFit: '近期热度',
  novelty: '新鲜感',
  distanceFit: '距离',
  placeTrend: '近期热度',
  placeSeason: '时令适配',
  placeMood: '心情适配',
}

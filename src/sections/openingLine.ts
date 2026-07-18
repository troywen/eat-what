/**
 * 结果区开场白：根据 天气 × 餐段 × 心情 × Top1 推荐 拼一句像朋友说的话。
 * 纯函数，方便单测与调文案。
 */
import type { CookMode, MealSlot, Mood, PlaceCandidate, Recipe, Recommendation, Weather } from '../core/types'

export interface OpeningLineInput {
  mode: CookMode
  weather: Weather
  mood: Mood
  slot: MealSlot
  top: Recommendation<Recipe> | Recommendation<PlaceCandidate>
}

/** 天气前缀词：雨雪优先，其次温度；温和天气返回空串。 */
function weatherWord(w: Weather): string {
  if (w.condition === 'rainy') return '下雨'
  if (w.condition === 'snowy') return '下雪'
  if (w.tempC < 10) return '天冷'
  if (w.tempC > 26) return '天热'
  return ''
}

const SLOT_SUFFIX: Record<MealSlot, string> = {
  breakfast: '的早上',
  lunch: '的中午',
  dinner: '的晚上',
  lateNight: '的深夜',
}

const MOOD_LINE: Record<Mood, string> = {
  happy: '开心的时候就得吃点好的',
  tired: '别太累',
  stressed: '先松口气',
  blue: '吃点好的哄哄自己',
  relaxed: '慢悠悠来点舒服的',
  adventurous: '正好来点新鲜的',
}

function scenePrefix(weather: Weather, slot: MealSlot): string {
  const w = weatherWord(weather)
  return w ? `${w}${SLOT_SUFFIX[slot]}` : `今天${SLOT_SUFFIX[slot]}`
}

export function buildOpeningLine({ mode, weather, mood, slot, top }: OpeningLineInput): string {
  const prefix = scenePrefix(weather, slot)
  const moodLine = MOOD_LINE[mood]

  if (mode === 'cook') {
    const r = top.candidate as Recipe
    return `${prefix}，${moodLine}——「${r.name}」刚好，${r.cookMinutes} 分钟就能上桌。`
  }
  if (mode === 'takeout') {
    const p = top.candidate as PlaceCandidate
    return `${prefix}，不想动就对了——「${p.name}」只有 ${p.distanceKm}km，热乎的很快送到。`
  }
  const p = top.candidate as PlaceCandidate
  return `${prefix}，出门透透气——「${p.name}」就在 ${p.distanceKm}km 外，现在去正合适。`
}

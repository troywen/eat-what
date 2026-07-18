/**
 * 周报统计：最近 7 天饮食记录的聚合（纯函数，now 可注入便于测试）。
 * 「最近 7 天」= 滚动 168 小时窗口（createdAt <= now 且 now - createdAt < 7 天）。
 */
import type { FoodRecord, Mood } from '../core/types'

export interface WeeklyStats {
  total: number
  cookCount: number
  takeoutCount: number
  dineoutCount: number
  /** 出现最多的心情（平局取先出现的）；无心情记录为 null */
  topMood: Mood | null
  /** 有评分记录的均值，保留 1 位小数；无评分为 null */
  avgRating: number | null
  /** 出现次数 Top3 菜名（去重计数，平局取先出现的） */
  topDishes: string[]
  /** 连续记录天数：从今天有记录起算，今天没有则从最近一条的日期往回数 */
  streak: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_MS = 7 * DAY_MS

/** 本地日历日序号（抹掉时分秒，用于按天去重/连续判断）。 */
function dayIndex(d: Date): number {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS)
}

export function computeWeeklyStats(records: FoodRecord[], now: Date = new Date()): WeeklyStats {
  const nowMs = now.getTime()
  const recent = records.filter((r) => {
    const t = Date.parse(r.createdAt)
    return !Number.isNaN(t) && t <= nowMs && nowMs - t < WINDOW_MS
  })

  // mode 计数 / 心情计数（保留出现顺序，平局取先）/ 评分 / 菜名计数
  let cookCount = 0
  let takeoutCount = 0
  let dineoutCount = 0
  const moodCounts = new Map<Mood, number>()
  let ratingSum = 0
  let ratingCount = 0
  const dishCounts = new Map<string, number>()

  for (const r of recent) {
    if (r.mode === 'cook') cookCount++
    else if (r.mode === 'takeout') takeoutCount++
    else if (r.mode === 'dineout') dineoutCount++
    if (r.mood) moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1)
    if (typeof r.rating === 'number') {
      ratingSum += r.rating
      ratingCount++
    }
    const name = r.dishName.trim()
    if (name) dishCounts.set(name, (dishCounts.get(name) ?? 0) + 1)
  }

  let topMood: Mood | null = null
  let topMoodCount = 0
  for (const [mood, count] of moodCounts) {
    if (count > topMoodCount) {
      topMood = mood
      topMoodCount = count
    }
  }

  const topDishes = [...dishCounts.entries()]
    .sort((a, b) => b[1] - a[1]) // Map 迭代保持插入序，稳定排序下平局取先
    .slice(0, 3)
    .map(([name]) => name)

  // streak：锚定今天（今天有记录）或最近一条的日期，往回数连续有记录的天
  let streak = 0
  if (recent.length > 0) {
    const daysWithRecords = new Set(recent.map((r) => dayIndex(new Date(Date.parse(r.createdAt)))))
    const todayIdx = dayIndex(now)
    let cursor = daysWithRecords.has(todayIdx) ? todayIdx : Math.max(...daysWithRecords)
    while (daysWithRecords.has(cursor)) {
      streak++
      cursor--
    }
  }

  return {
    total: recent.length,
    cookCount,
    takeoutCount,
    dineoutCount,
    topMood,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    topDishes,
    streak,
  }
}

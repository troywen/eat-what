import { describe, expect, it } from 'vitest'
import { computeWeeklyStats } from './weeklyStats'
import type { FoodRecord } from '../core/types'

// 固定「现在」：2026-07-17（周五）12:00
const NOW = new Date(2026, 6, 17, 12, 0, 0)

function daysAgo(days: number, hour = 12): string {
  return new Date(2026, 6, 17 - days, hour, 0, 0).toISOString()
}

function makeRecord(overrides: Partial<FoodRecord> = {}): FoodRecord {
  return {
    id: `fr_${Math.random().toString(36).slice(2, 8)}`,
    dishName: '番茄炒蛋',
    note: '',
    visibility: 'private',
    comments: [],
    createdAt: daysAgo(0),
    ...overrides,
  }
}

describe('computeWeeklyStats', () => {
  it('空记录：全部归零 / null / 空数组', () => {
    expect(computeWeeklyStats([], NOW)).toEqual({
      total: 0,
      cookCount: 0,
      takeoutCount: 0,
      dineoutCount: 0,
      topMood: null,
      avgRating: null,
      topDishes: [],
      streak: 0,
    })
  })

  it('跨周过滤：8 天前的记录不计入，6 天前的计入', () => {
    const stats = computeWeeklyStats(
      [makeRecord({ dishName: '新', createdAt: daysAgo(6) }), makeRecord({ dishName: '旧', createdAt: daysAgo(8) })],
      NOW,
    )
    expect(stats.total).toBe(1)
    expect(stats.topDishes).toEqual(['新'])
  })

  it('未来时间的记录不计入', () => {
    const stats = computeWeeklyStats([makeRecord({ createdAt: daysAgo(-1) })], NOW)
    expect(stats.total).toBe(0)
  })

  it('各 mode 计数：cook / takeout / dineout / 缺 mode', () => {
    const stats = computeWeeklyStats(
      [
        makeRecord({ mode: 'cook' }),
        makeRecord({ mode: 'cook' }),
        makeRecord({ mode: 'takeout' }),
        makeRecord({ mode: 'dineout' }),
        makeRecord(), // 无 mode 不计入任何一类
      ],
      NOW,
    )
    expect(stats.total).toBe(5)
    expect(stats.cookCount).toBe(2)
    expect(stats.takeoutCount).toBe(1)
    expect(stats.dineoutCount).toBe(1)
  })

  it('topMood 取出现最多的心情', () => {
    const stats = computeWeeklyStats(
      [makeRecord({ mood: 'happy' }), makeRecord({ mood: 'tired' }), makeRecord({ mood: 'happy' })],
      NOW,
    )
    expect(stats.topMood).toBe('happy')
  })

  it('topMood 平局取先出现的；无心情记录为 null', () => {
    const tie = computeWeeklyStats([makeRecord({ mood: 'tired' }), makeRecord({ mood: 'happy' })], NOW)
    expect(tie.topMood).toBe('tired')
    expect(computeWeeklyStats([makeRecord()], NOW).topMood).toBeNull()
  })

  it('avgRating：无评分记录为 null，有评分取均值保留 1 位小数', () => {
    expect(computeWeeklyStats([makeRecord(), makeRecord({ note: '也没评' })], NOW).avgRating).toBeNull()
    const stats = computeWeeklyStats(
      [makeRecord({ rating: 4 }), makeRecord({ rating: 5 }), makeRecord()], // 第三条无评分不参与
      NOW,
    )
    expect(stats.avgRating).toBe(4.5)
  })

  it('topDishes：去重计数取 Top3，按次数降序', () => {
    const stats = computeWeeklyStats(
      [
        makeRecord({ dishName: '番茄炒蛋' }),
        makeRecord({ dishName: '红烧肉' }),
        makeRecord({ dishName: '番茄炒蛋' }),
        makeRecord({ dishName: '咖喱鸡' }),
        makeRecord({ dishName: '红烧肉' }),
        makeRecord({ dishName: '蒸蛋羹' }),
        makeRecord({ dishName: '番茄炒蛋' }),
      ],
      NOW,
    )
    expect(stats.topDishes).toEqual(['番茄炒蛋', '红烧肉', '咖喱鸡'])
  })

  it('streak：今天起连续 3 天有记录 → 3', () => {
    const stats = computeWeeklyStats(
      [
        makeRecord({ createdAt: daysAgo(0, 8) }),
        makeRecord({ createdAt: daysAgo(1) }),
        makeRecord({ createdAt: daysAgo(2) }),
        makeRecord({ createdAt: daysAgo(4) }), // 断档，不计
      ],
      NOW,
    )
    expect(stats.streak).toBe(3)
  })

  it('streak：今天没记录则从最近一条往回数；断档即停', () => {
    const stats = computeWeeklyStats(
      [
        makeRecord({ createdAt: daysAgo(2) }),
        makeRecord({ createdAt: daysAgo(3) }),
        // daysAgo(4) 缺失 → 断档
        makeRecord({ createdAt: daysAgo(5) }),
      ],
      NOW,
    )
    expect(stats.streak).toBe(2)
  })

  it('streak：同一天多条记录只算一天', () => {
    const stats = computeWeeklyStats(
      [makeRecord({ createdAt: daysAgo(0, 8) }), makeRecord({ createdAt: daysAgo(0, 20) }), makeRecord({ createdAt: daysAgo(1) })],
      NOW,
    )
    expect(stats.streak).toBe(2)
  })
})

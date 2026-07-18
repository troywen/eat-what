import { describe, expect, it } from 'vitest'
import { addRecentEaten, loadRecentEaten, type StorageLike } from './recentEatenStore'

const KEY = 'eatwhat.recent.v1'
const NOW = new Date(2026, 6, 17, 12, 0, 0).getTime()

function makeStorageStub(): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  }
}

function seed(stub: StorageLike, entries: { id: string; at: string }[]) {
  stub.setItem(KEY, JSON.stringify(entries))
}

describe('recentEatenStore', () => {
  it('空存储返回空数组', () => {
    expect(loadRecentEaten(makeStorageStub(), NOW)).toEqual([])
  })

  it('过期过滤：7 天前的旧记录被滤掉，7 天内保留', () => {
    const stub = makeStorageStub()
    seed(stub, [
      { id: 'r001', at: new Date(NOW - 2 * 24 * 3600 * 1000).toISOString() }, // 2 天前
      { id: 'r002', at: new Date(NOW - 8 * 24 * 3600 * 1000).toISOString() }, // 8 天前
      { id: 'r003', at: new Date(NOW - 6 * 24 * 3600 * 1000).toISOString() }, // 6 天前
    ])
    expect(loadRecentEaten(stub, NOW)).toEqual(['r001', 'r003'])
  })

  it('追加去重：同 id 不重复，且时间被刷新', () => {
    const stub = makeStorageStub()
    seed(stub, [{ id: 'r001', at: new Date(NOW - 5 * 24 * 3600 * 1000).toISOString() }])
    const merged = addRecentEaten(['r001', 'r006'], stub, NOW)
    expect(merged.sort()).toEqual(['r001', 'r006'])

    const raw = JSON.parse(stub.dump()[KEY]) as { id: string; at: string }[]
    expect(raw).toHaveLength(2)
    const r001 = raw.find((e) => e.id === 'r001')!
    expect(Date.parse(r001.at)).toBe(NOW) // 时间刷新为最新
  })

  it('addRecentEaten 持久化后可被 loadRecentEaten 读回', () => {
    const stub = makeStorageStub()
    addRecentEaten(['r001', 'r002'], stub, NOW)
    expect(loadRecentEaten(stub, NOW).sort()).toEqual(['r001', 'r002'])
  })

  it('损坏 JSON 容错为空，不抛错', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, '{{{broken')
    expect(loadRecentEaten(stub, NOW)).toEqual([])
    expect(() => addRecentEaten(['r001'], stub, NOW)).not.toThrow()
  })

  it('结构不合法的条目被过滤', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, JSON.stringify([{ id: 'r001', at: 'bad-date' }, { nope: true }, { id: 'r002', at: new Date(NOW).toISOString() }]))
    expect(loadRecentEaten(stub, NOW)).toEqual(['r002'])
  })

  it('storage 不可用时安全降级', () => {
    expect(loadRecentEaten(undefined, NOW)).toEqual([])
    expect(addRecentEaten(['r001', 'r001'], undefined, NOW)).toEqual(['r001'])
  })
})

/**
 * localStorage 版饮食记录仓库（UI 层实现，core 保持无 DOM）。
 * 读写均 try/catch 容错：storage 不可用或数据损坏时降级为空列表。
 */
import type { FoodRecord } from '../core/types'
import type { RecordRepository } from '../core/services/recordStore'

const STORAGE_KEY = 'eatwhat.records.v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export function createLocalRecordRepo(storage?: StorageLike): RecordRepository {
  const store: StorageLike | undefined = storage ?? defaultStorage()

  function read(): FoodRecord[] {
    if (!store) return []
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as FoodRecord[]) : []
    } catch (e) {
      console.warn('[eat-what] 读取饮食记录失败，按空记录处理', e)
      return []
    }
  }

  function write(records: FoodRecord[]): void {
    if (!store) return
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (e) {
      console.warn('[eat-what] 写入饮食记录失败（可能超出 localStorage 配额）', e)
    }
  }

  return {
    list: () => read(),
    add(record) {
      write([...read(), record])
    },
    update(record) {
      write(read().map((r) => (r.id === record.id ? record : r)))
    },
    remove(id) {
      write(read().filter((r) => r.id !== id))
    },
  }
}

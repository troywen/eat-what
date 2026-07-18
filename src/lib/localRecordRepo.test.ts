import { describe, expect, it } from 'vitest'
import { createLocalRecordRepo, type StorageLike } from './localRecordRepo'
import type { FoodRecord } from '../core/types'

/** 内存版 localStorage stub（无 jsdom 环境） */
function makeStorageStub(): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  }
}

function makeRecord(overrides: Partial<FoodRecord> = {}): FoodRecord {
  return {
    id: 'fr1',
    dishName: '番茄炒蛋',
    note: '汤汁拌饭绝了',
    visibility: 'private',
    comments: [],
    createdAt: new Date(2026, 0, 15, 19, 30).toISOString(),
    ...overrides,
  }
}

describe('createLocalRecordRepo', () => {
  it('add/list 序列化往返正确（写入的是 eatwhat.records.v1）', () => {
    const stub = makeStorageStub()
    const repo = createLocalRecordRepo(stub)
    expect(repo.list()).toEqual([])

    repo.add(makeRecord())
    const raw = stub.dump()['eatwhat.records.v1']
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw)).toHaveLength(1)

    const back = repo.list()
    expect(back).toHaveLength(1)
    expect(back[0]).toEqual(makeRecord())
  })

  it('remove 持久化删除', () => {
    const stub = makeStorageStub()
    const repo = createLocalRecordRepo(stub)
    repo.add(makeRecord())
    repo.add(makeRecord({ id: 'fr2', dishName: '红烧肉' }))
    repo.remove('fr1')
    expect(repo.list().map((r) => r.id)).toEqual(['fr2'])
    expect(JSON.parse(stub.dump()['eatwhat.records.v1'])).toHaveLength(1)
  })

  it('update 持久化整条替换，id 未命中时列表不变', () => {
    const stub = makeStorageStub()
    const repo = createLocalRecordRepo(stub)
    repo.add(makeRecord())
    repo.add(makeRecord({ id: 'fr2', dishName: '红烧肉' }))

    repo.update(makeRecord({ id: 'fr1', dishName: '番茄牛腩', note: '改过的备注', rating: 5 }))
    const list = repo.list()
    expect(list).toHaveLength(2)
    expect(list[0].dishName).toBe('番茄牛腩')
    expect(list[0].note).toBe('改过的备注')
    expect(list[0].rating).toBe(5)
    expect(list[1].dishName).toBe('红烧肉') // 顺序与其他记录不动
    expect(JSON.parse(stub.dump()['eatwhat.records.v1'])).toHaveLength(2)

    repo.update(makeRecord({ id: 'not-exist', dishName: '幽灵菜' }))
    expect(repo.list()).toHaveLength(2)
  })

  it('数据损坏时容错为空列表，不抛错', () => {
    const stub = makeStorageStub()
    stub.setItem('eatwhat.records.v1', '{broken json')
    const repo = createLocalRecordRepo(stub)
    expect(repo.list()).toEqual([])
  })

  it('非数组内容容错为空列表', () => {
    const stub = makeStorageStub()
    stub.setItem('eatwhat.records.v1', '{"foo":1}')
    expect(createLocalRecordRepo(stub).list()).toEqual([])
  })

  it('storage 不可用（undefined）时降级为内存空实现，不抛错', () => {
    const repo = createLocalRecordRepo(undefined)
    expect(repo.list()).toEqual([])
    expect(() => {
      repo.add(makeRecord())
      repo.remove('fr1')
    }).not.toThrow()
    expect(repo.list()).toEqual([])
  })
})

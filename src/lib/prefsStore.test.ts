import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, savePrefs, type UserPrefs } from './prefsStore'
import type { StorageLike } from './recentEatenStore'

const KEY = 'eatwhat.prefs.v1'

function makeStorageStub(): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  }
}

const SAMPLE: UserPrefs = {
  selectedIngredients: ['鸡蛋', '西红柿'],
  customIngredients: ['腊肠'],
  dislikes: ['香菜'],
  tastePercent: 80,
  people: 4,
}

describe('prefsStore', () => {
  it('空存储返回默认偏好', () => {
    expect(loadPrefs(makeStorageStub())).toEqual(DEFAULT_PREFS)
  })

  it('往返读写：savePrefs 后 loadPrefs 读回一致', () => {
    const stub = makeStorageStub()
    savePrefs(SAMPLE, stub)
    expect(loadPrefs(stub)).toEqual(SAMPLE)
  })

  it('损坏 JSON 容错为默认，不抛错', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, '{{{broken')
    expect(loadPrefs(stub)).toEqual(DEFAULT_PREFS)
    expect(() => savePrefs(SAMPLE, stub)).not.toThrow()
  })

  it('非对象结构（数组/数字/null）回退默认', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, JSON.stringify([1, 2, 3]))
    expect(loadPrefs(stub)).toEqual(DEFAULT_PREFS)
    stub.setItem(KEY, JSON.stringify(42))
    expect(loadPrefs(stub)).toEqual(DEFAULT_PREFS)
    stub.setItem(KEY, JSON.stringify(null))
    expect(loadPrefs(stub)).toEqual(DEFAULT_PREFS)
  })

  it('字段缺失补默认，其余字段保留', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, JSON.stringify({ dislikes: ['葱'], people: 1 }))
    expect(loadPrefs(stub)).toEqual({
      ...DEFAULT_PREFS,
      dislikes: ['葱'],
      people: 1,
    })
  })

  it('非法 tastePercent 回退 50：字符串、超范围、NaN', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, JSON.stringify({ ...SAMPLE, tastePercent: 'abc' }))
    expect(loadPrefs(stub).tastePercent).toBe(50)
    stub.setItem(KEY, JSON.stringify({ ...SAMPLE, tastePercent: 300 }))
    expect(loadPrefs(stub).tastePercent).toBe(50)
    stub.setItem(KEY, JSON.stringify({ ...SAMPLE, tastePercent: -5 }))
    expect(loadPrefs(stub).tastePercent).toBe(50)
    // 合法值保留
    stub.setItem(KEY, JSON.stringify({ ...SAMPLE, tastePercent: 0 }))
    expect(loadPrefs(stub).tastePercent).toBe(0)
  })

  it('非法 people 回退 2：非 1|2|4', () => {
    const stub = makeStorageStub()
    stub.setItem(KEY, JSON.stringify({ ...SAMPLE, people: 3 }))
    expect(loadPrefs(stub).people).toBe(2)
    stub.setItem(KEY, JSON.stringify({ ...SAMPLE, people: '4' }))
    expect(loadPrefs(stub).people).toBe(2)
  })

  it('数组字段混进非字符串条目被过滤，非数组回退空', () => {
    const stub = makeStorageStub()
    stub.setItem(
      KEY,
      JSON.stringify({ ...SAMPLE, selectedIngredients: ['鸡蛋', 123, null], customIngredients: 'oops' }),
    )
    const prefs = loadPrefs(stub)
    expect(prefs.selectedIngredients).toEqual(['鸡蛋'])
    expect(prefs.customIngredients).toEqual([])
  })

  it('storage 不可用时安全降级', () => {
    expect(loadPrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(() => savePrefs(SAMPLE, undefined)).not.toThrow()
  })
})

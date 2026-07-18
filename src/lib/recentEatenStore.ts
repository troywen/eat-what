/**
 * 「最近吃过」持久化：localStorage 存 { id, at }[]，读取时过滤 7 天前的旧记录。
 * 读写 try/catch 容错；storage 可注入便于测试。
 */

const STORAGE_KEY = 'eatwhat.recent.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

export interface RecentEntry {
  id: string;
  at: string; // ISO 时间
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

function readEntries(store: StorageLike): RecentEntry[] {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentEntry[]).filter(
      (e) => e && typeof e.id === 'string' && typeof e.at === 'string' && !Number.isNaN(Date.parse(e.at)),
    );
  } catch (e) {
    console.warn('[eat-what] 读取最近吃过失败，按空处理', e);
    return [];
  }
}

function fresh(entries: RecentEntry[], now: number): RecentEntry[] {
  return entries.filter((e) => now - Date.parse(e.at) < TTL_MS);
}

export function loadRecentEaten(storage?: StorageLike, now: number = Date.now()): string[] {
  const store = storage ?? defaultStorage();
  if (!store) return [];
  return fresh(readEntries(store), now).map((e) => e.id);
}

/** 追加去重（同 id 刷新时间），写回后返回最新 id 列表。 */
export function addRecentEaten(ids: string[], storage?: StorageLike, now: number = Date.now()): string[] {
  const store = storage ?? defaultStorage();
  if (!store) return [...new Set(ids)];
  const map = new Map<string, RecentEntry>();
  for (const e of fresh(readEntries(store), now)) map.set(e.id, e);
  for (const id of ids) map.set(id, { id, at: new Date(now).toISOString() });
  const merged = [...map.values()];
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('[eat-what] 写入最近吃过失败', e);
  }
  return merged.map((e) => e.id);
}

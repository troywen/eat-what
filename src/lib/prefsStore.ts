/**
 * 「记住你家冰箱」用户偏好持久化：localStorage 存一份 UserPrefs。
 * 读取时逐字段校验类型，非法字段回退默认；整个对象坏了回退 DEFAULT_PREFS。
 * 读写 try/catch 容错；storage 可注入便于测试。
 * 心情 mood 不在这里——心情是当下的，不该记住。
 */

import type { StorageLike } from './recentEatenStore';

const STORAGE_KEY = 'eatwhat.prefs.v1';

export interface UserPrefs {
  selectedIngredients: string[]; // 已选冰箱食材
  customIngredients: string[]; // 用户自己加的食材
  dislikes: string[]; // 忌口
  tastePercent: number; // 口味滑杆 0-100
  people: number; // 几个人吃 1|2|4
}

export const DEFAULT_PREFS: UserPrefs = {
  selectedIngredients: [],
  customIngredients: [],
  dislikes: [],
  tastePercent: 50,
  people: 2,
};

const PEOPLE_OPTIONS = [1, 2, 4];

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((v): v is string => typeof v === 'string');
}

function asTastePercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PREFS.tastePercent;
  if (value < 0 || value > 100) return DEFAULT_PREFS.tastePercent;
  return value;
}

function asPeople(value: unknown): number {
  if (typeof value !== 'number' || !PEOPLE_OPTIONS.includes(value)) return DEFAULT_PREFS.people;
  return value;
}

export function loadPrefs(storage?: StorageLike): UserPrefs {
  const store = storage ?? defaultStorage();
  if (!store) return { ...DEFAULT_PREFS };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_PREFS };
    }
    const p = parsed as Record<string, unknown>;
    return {
      selectedIngredients: asStringArray(p.selectedIngredients, DEFAULT_PREFS.selectedIngredients),
      customIngredients: asStringArray(p.customIngredients, DEFAULT_PREFS.customIngredients),
      dislikes: asStringArray(p.dislikes, DEFAULT_PREFS.dislikes),
      tastePercent: asTastePercent(p.tastePercent),
      people: asPeople(p.people),
    };
  } catch (e) {
    console.warn('[eat-what] 读取用户偏好失败，按默认处理', e);
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: UserPrefs, storage?: StorageLike): void {
  const store = storage ?? defaultStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[eat-what] 写入用户偏好失败', e);
  }
}

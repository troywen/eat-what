/**
 * 饮食记录存储抽象（预留分享/评论，本地先行）。
 *
 * - Web 端：localStorage 实现在 UI 层（保持 core 无 DOM 依赖）。
 * - 上线后：实现 ApiRecordRepository 走服务端；
 *   分享走 visibility: 'shared'，评论走 comments 字段。
 */
import type { FoodRecord, Recipe } from '../types';

export interface RecordRepository {
  list(): FoodRecord[];
  add(record: FoodRecord): void;
  /** 按 id 整条替换（编辑保存）；id 不存在时忽略。 */
  update(record: FoodRecord): void;
  remove(id: string): void;
}

/** 内存实现：供单元测试 / 服务端初始阶段使用。 */
export function createMemoryRecordRepo(): RecordRepository {
  const records: FoodRecord[] = [];
  return {
    list() {
      return [...records];
    },
    add(record) {
      records.push(record);
    },
    update(record) {
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx >= 0) records.splice(idx, 1, record);
    },
    remove(id) {
      const idx = records.findIndex((r) => r.id === id);
      if (idx >= 0) records.splice(idx, 1);
    },
  };
}

/**
 * 把饮食记录按菜名映射回菜谱 id（双向包含匹配），
 * 用于把记录喂给 novelty scorer 做降权。
 */
export function matchRecipeIdsByDishName(records: FoodRecord[], recipes: Recipe[]): string[] {
  const ids = new Set<string>();
  for (const record of records) {
    const name = record.dishName.trim();
    if (!name) continue;
    for (const recipe of recipes) {
      if (recipe.name.includes(name) || name.includes(recipe.name)) {
        ids.add(recipe.id);
      }
    }
  }
  return [...ids];
}

import { describe, expect, it } from 'vitest';
import { createMemoryRecordRepo, matchRecipeIdsByDishName } from '../../services/recordStore';
import { RECIPES } from '../../data/recipes';
import type { FoodRecord } from '../../types';

function makeRecord(overrides: Partial<FoodRecord> = {}): FoodRecord {
  return {
    id: 'fr1',
    dishName: '番茄炒蛋',
    note: '今天做的，汤汁拌饭绝了',
    visibility: 'private',
    comments: [],
    createdAt: new Date(2026, 0, 15, 19, 30).toISOString(),
    ...overrides,
  };
}

describe('createMemoryRecordRepo 增删查', () => {
  it('初始为空，add 后可 list 出来', () => {
    const repo = createMemoryRecordRepo();
    expect(repo.list()).toHaveLength(0);
    repo.add(makeRecord());
    repo.add(makeRecord({ id: 'fr2', dishName: '红烧肉' }));
    expect(repo.list()).toHaveLength(2);
    expect(repo.list()[0].dishName).toBe('番茄炒蛋');
  });

  it('remove 按 id 删除，删不存在的 id 不报错', () => {
    const repo = createMemoryRecordRepo();
    repo.add(makeRecord());
    repo.add(makeRecord({ id: 'fr2', dishName: '红烧肉' }));
    repo.remove('fr1');
    expect(repo.list()).toHaveLength(1);
    expect(repo.list()[0].id).toBe('fr2');
    repo.remove('not-exist');
    expect(repo.list()).toHaveLength(1);
  });

  it('update 按 id 整条替换，未命中 id 时忽略', () => {
    const repo = createMemoryRecordRepo();
    repo.add(makeRecord());
    repo.add(makeRecord({ id: 'fr2', dishName: '红烧肉' }));
    repo.update(makeRecord({ id: 'fr2', dishName: '红烧排骨', note: '改版', rating: 4 }));
    expect(repo.list()).toHaveLength(2);
    expect(repo.list()[1].dishName).toBe('红烧排骨');
    expect(repo.list()[1].rating).toBe(4);
    expect(repo.list()[0].dishName).toBe('番茄炒蛋'); // 其他记录不动
    repo.update(makeRecord({ id: 'not-exist', dishName: '幽灵菜' }));
    expect(repo.list()).toHaveLength(2);
  });

  it('list 返回副本，外部修改不影响仓库', () => {
    const repo = createMemoryRecordRepo();
    repo.add(makeRecord());
    repo.list().push(makeRecord({ id: 'hack' }));
    expect(repo.list()).toHaveLength(1);
  });

  it('记录的预留字段（visibility/comments）结构正确', () => {
    const repo = createMemoryRecordRepo();
    repo.add(makeRecord({ visibility: 'shared', rating: 5, mood: 'happy', mode: 'cook' }));
    const r = repo.list()[0];
    expect(r.visibility).toBe('shared');
    expect(r.comments).toEqual([]);
    expect(r.rating).toBe(5);
  });
});

describe('matchRecipeIdsByDishName', () => {
  it('「番茄炒蛋」精确命中菜谱 r006', () => {
    const ids = matchRecipeIdsByDishName([makeRecord()], RECIPES);
    expect(ids).toContain('r006');
  });

  it('部分菜名「番茄」命中多道番茄菜', () => {
    const ids = matchRecipeIdsByDishName([makeRecord({ dishName: '番茄' })], RECIPES);
    expect(ids.length).toBeGreaterThanOrEqual(3); // 番茄鸡蛋面 / 番茄炒蛋 / 番茄牛腩煲
    expect(ids).toContain('r006');
  });

  it('「不存在的菜」不命中任何菜谱', () => {
    expect(matchRecipeIdsByDishName([makeRecord({ dishName: '不存在的菜' })], RECIPES)).toHaveLength(0);
  });

  it('多条记录去重合并，空记录返回空数组', () => {
    const ids = matchRecipeIdsByDishName(
      [makeRecord({ dishName: '番茄炒蛋' }), makeRecord({ id: 'fr2', dishName: '番茄炒蛋盖饭' })],
      RECIPES,
    );
    expect(ids).toEqual(['r006']); // 去重
    expect(matchRecipeIdsByDishName([], RECIPES)).toEqual([]);
  });
});

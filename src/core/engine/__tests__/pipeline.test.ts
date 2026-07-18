import { describe, expect, it } from 'vitest';
import { runPipeline } from '../pipeline';
import type { Scorer } from '../../types';
import { makeCtx } from './helpers';

interface Item {
  id: string;
  value: number;
}

const byValue: Scorer<Item> = {
  key: 'byValue',
  score: (item) => ({ score: item.value, reason: `value is ${item.value}` }),
};

const constant: Scorer<Item> = {
  key: 'constant',
  score: () => ({ score: 0.5, reason: '恒定 0.5' }),
};

const noReason: Scorer<Item> = {
  key: 'noReason',
  score: () => ({ score: 1 }),
};

const items: Item[] = [
  { id: 'a', value: 0.2 },
  { id: 'b', value: 0.9 },
  { id: 'c', value: 0.5 },
];

describe('runPipeline', () => {
  it('按总分降序排列并截取 TopN', () => {
    const result = runPipeline(items, [byValue], { byValue: 1 }, makeCtx(), 2);
    expect(result).toHaveLength(2);
    expect(result[0].candidate.id).toBe('b');
    expect(result[1].candidate.id).toBe('c');
    expect(result[0].totalScore).toBeGreaterThan(result[1].totalScore);
  });

  it('非归一化权重会被自动归一', () => {
    // 权重 2:1 → 归一化为 2/3、1/3
    const result = runPipeline(items, [byValue, constant], { byValue: 2, constant: 1 }, makeCtx(), 3);
    const b = result.find((r) => r.candidate.id === 'b')!;
    const byValueBd = b.breakdown.find((d) => d.scorerKey === 'byValue')!;
    const constBd = b.breakdown.find((d) => d.scorerKey === 'constant')!;
    expect(byValueBd.weight).toBeCloseTo(2 / 3);
    expect(constBd.weight).toBeCloseTo(1 / 3);
    expect(b.totalScore).toBeCloseTo((2 / 3) * 0.9 + (1 / 3) * 0.5);
  });

  it('breakdown 完整：每个 scorer 一项，weightedScore = weight × rawScore', () => {
    const result = runPipeline(items, [byValue, constant], { byValue: 1, constant: 1 }, makeCtx(), 3);
    for (const rec of result) {
      expect(rec.breakdown).toHaveLength(2);
      for (const bd of rec.breakdown) {
        expect(bd.weightedScore).toBeCloseTo(bd.weight * bd.rawScore);
      }
    }
  });

  it('summary 取权重最高两项的理由拼接', () => {
    const result = runPipeline(
      [{ id: 'x', value: 0.8 }],
      [byValue, constant, noReason],
      { byValue: 2, constant: 1, noReason: 3 },
      makeCtx(),
      1,
    );
    // noReason 权重最高但无理由 → 应拼接 byValue 与 constant 的理由
    expect(result[0].summary).toBe('value is 0.8；恒定 0.5');
  });

  it('超出 [0,1] 的分数会被截断', () => {
    const crazy: Scorer<Item> = { key: 'crazy', score: () => ({ score: 1.8 }) };
    const result = runPipeline([{ id: 'x', value: 0 }], [crazy], { crazy: 1 }, makeCtx(), 1);
    expect(result[0].totalScore).toBe(1);
  });

  it('权重和为 0 时抛错', () => {
    expect(() => runPipeline(items, [byValue], { byValue: 0 }, makeCtx(), 1)).toThrow();
  });

  it('scorer 没有对应权重项时权重按 0 处理', () => {
    const result = runPipeline(items, [byValue, constant], { byValue: 1 }, makeCtx(), 3);
    const constBd = result[0].breakdown.find((d) => d.scorerKey === 'constant')!;
    expect(constBd.weight).toBe(0);
    expect(constBd.weightedScore).toBe(0);
  });
});

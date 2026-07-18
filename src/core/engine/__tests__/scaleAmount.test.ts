import { describe, expect, it } from 'vitest';
import { scaleAmount } from '../scaleAmount';

describe('scaleAmount 份量缩放', () => {
  it('整数 × 整数：「3个（约150g）」×2 →「6个（约300g）」', () => {
    expect(scaleAmount('3个（约150g）', 2)).toBe('6个（约300g）');
  });

  it('小数 × 整数：「1.5勺（约15ml）」×2 →「3勺（约30ml）」', () => {
    expect(scaleAmount('1.5勺（约15ml）', 2)).toBe('3勺（约30ml）');
  });

  it('多数字一起缩放，非数字部分原样保留', () => {
    expect(scaleAmount('2勺生抽 + 3片姜', 2)).toBe('4勺生抽 + 6片姜');
  });

  it('小于 10 保留 0.5 步进：0.75→1、1.3→1.5、2.6→2.5', () => {
    expect(scaleAmount('1小勺', 0.75)).toBe('1小勺');
    expect(scaleAmount('1.3g', 1)).toBe('1.5g');
    expect(scaleAmount('2.6g', 1)).toBe('2.5g');
  });

  it('大于等于 10 四舍五入取整', () => {
    expect(scaleAmount('2个', 6)).toBe('12个');
    expect(scaleAmount('9.6g', 1.2)).toBe('12g'); // 11.52 → 12
    expect(scaleAmount('150g', 0.1)).toBe('15g');
  });

  it('factor=1：整数用量不变', () => {
    expect(scaleAmount('3个（约150g）', 1)).toBe('3个（约150g）');
  });

  it('无数字的串原样返回', () => {
    expect(scaleAmount('适量', 2)).toBe('适量');
    expect(scaleAmount('少许（可选）', 3)).toBe('少许（可选）');
  });

  it('极端 factor：×0 → 0；×10 正常放大', () => {
    expect(scaleAmount('3个', 0)).toBe('0个');
    expect(scaleAmount('3个', 10)).toBe('30个');
  });
});

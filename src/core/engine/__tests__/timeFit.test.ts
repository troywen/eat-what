import { describe, expect, it } from 'vitest';
import { timeFit } from '../scorers/timeFit';
import { getMealSlot } from '../../services/weather';
import { makeCtx, makeRecipe } from './helpers';

function at(hour: number): Date {
  return new Date(2026, 6, 17, hour, 0, 0);
}

describe('getMealSlot 餐段推导', () => {
  it('5-9 点为早餐', () => {
    expect(getMealSlot(at(5))).toBe('breakfast');
    expect(getMealSlot(at(9))).toBe('breakfast');
  });
  it('10-14 点为午餐', () => {
    expect(getMealSlot(at(10))).toBe('lunch');
    expect(getMealSlot(at(14))).toBe('lunch');
  });
  it('16-20 点为晚餐', () => {
    expect(getMealSlot(at(16))).toBe('dinner');
    expect(getMealSlot(at(20))).toBe('dinner');
  });
  it('21 点到次日 4 点为夜宵', () => {
    expect(getMealSlot(at(21))).toBe('lateNight');
    expect(getMealSlot(at(0))).toBe('lateNight');
    expect(getMealSlot(at(4))).toBe('lateNight');
  });
});

describe('timeFit scorer', () => {
  const lunchDish = makeRecipe({ mealSlots: ['lunch'], cookMinutes: 15 });
  const breakfastOnly = makeRecipe({ mealSlots: ['breakfast'] });

  it('餐段匹配且省时（15/60 分钟）→ 1.0', () => {
    const r = timeFit.score(lunchDish, makeCtx({ now: at(12), availableMinutes: 60 }));
    expect(r.score).toBe(1);
    expect(r.reason).toContain('15');
  });

  it('餐段不匹配 → 0.2', () => {
    const r = timeFit.score(breakfastOnly, makeCtx({ now: at(12) }));
    expect(r.score).toBe(0.2);
  });

  it('烹饪时长超过可用时间 → 0.1 强降权', () => {
    const slow = makeRecipe({ mealSlots: ['lunch'], cookMinutes: 45 });
    const r = timeFit.score(slow, makeCtx({ now: at(12), availableMinutes: 30 }));
    expect(r.score).toBe(0.1);
    expect(r.reason).toContain('45');
  });

  it('越省时越高分：同餐段下快手菜 > 耗时菜', () => {
    const quick = makeRecipe({ mealSlots: ['lunch'], cookMinutes: 10 });
    const slow = makeRecipe({ mealSlots: ['lunch'], cookMinutes: 35 });
    const ctx = makeCtx({ now: at(12), availableMinutes: 60 });
    expect(timeFit.score(quick, ctx).score).toBeGreaterThan(timeFit.score(slow, ctx).score);
  });

  it('夜宵时段匹配夜宵菜', () => {
    const lateDish = makeRecipe({ mealSlots: ['lateNight'], cookMinutes: 10 });
    const r = timeFit.score(lateDish, makeCtx({ now: at(23), availableMinutes: 30 }));
    expect(r.score).toBeGreaterThanOrEqual(0.85);
  });
});

import { describe, expect, it } from 'vitest';
import { weatherFit } from '../scorers/weatherFit';
import { makeCtx, makeRecipe, makeWeather } from './helpers';

describe('weatherFit scorer', () => {
  const hotPot = makeRecipe({ warmth: 'hot' });
  const coolSalad = makeRecipe({ warmth: 'cool' });
  const coldDish = makeRecipe({ warmth: 'cold' });
  const neutralDish = makeRecipe({ warmth: 'neutral' });

  it('冷天（5°C）热汤锅物得满分', () => {
    const ctx = makeCtx({ weather: makeWeather({ tempC: 5 }) });
    expect(weatherFit.score(hotPot, ctx).score).toBe(1);
  });

  it('冷天凉拌菜被压分', () => {
    const ctx = makeCtx({ weather: makeWeather({ tempC: 5 }) });
    const r = weatherFit.score(coolSalad, ctx);
    expect(r.score).toBeLessThan(0.5);
  });

  it('热天（32°C）凉拌/冰冷菜得高分', () => {
    const ctx = makeCtx({ weather: makeWeather({ tempC: 32 }) });
    expect(weatherFit.score(coldDish, ctx).score).toBe(1);
    expect(weatherFit.score(coolSalad, ctx).score).toBeGreaterThanOrEqual(0.9);
  });

  it('热天火锅被压分', () => {
    const ctx = makeCtx({ weather: makeWeather({ tempC: 32 }) });
    expect(weatherFit.score(hotPot, ctx).score).toBeLessThanOrEqual(0.2);
  });

  it('温和天气（20°C）neutral 菜得满分', () => {
    const ctx = makeCtx({ weather: makeWeather({ tempC: 20 }) });
    expect(weatherFit.score(neutralDish, ctx).score).toBe(1);
  });

  it('雨天对 hot 菜额外加成且理由提及雨雪', () => {
    const rainy = makeCtx({ weather: makeWeather({ tempC: 20, condition: 'rainy' }) });
    const sunny = makeCtx({ weather: makeWeather({ tempC: 20, condition: 'sunny' }) });
    const rainyScore = weatherFit.score(hotPot, rainy);
    const sunnyScore = weatherFit.score(hotPot, sunny);
    expect(rainyScore.score).toBeGreaterThan(sunnyScore.score);
    expect(rainyScore.reason).toContain('雨雪');
  });

  it('雪天冷天的热菜加成后封顶 1.0', () => {
    const ctx = makeCtx({ weather: makeWeather({ tempC: 3, condition: 'snowy' }) });
    expect(weatherFit.score(hotPot, ctx).score).toBe(1);
  });

  it('任意天气分数都在 [0,1] 且理由非空', () => {
    for (const tempC of [-5, 8, 15, 25, 28, 38]) {
      const ctx = makeCtx({ weather: makeWeather({ tempC }) });
      const r = weatherFit.score(hotPot, ctx);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.reason).toBeTruthy();
    }
  });
});

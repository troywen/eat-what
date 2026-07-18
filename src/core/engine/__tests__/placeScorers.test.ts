import { describe, expect, it } from 'vitest';
import { distanceFit, placeMood, placeSeason, placeTrend } from '../scorers/placeScorers';
import type { PlaceCandidate } from '../../types';
import { makeCtx } from './helpers';

function makePlace(overrides: Partial<PlaceCandidate> = {}): PlaceCandidate {
  return {
    id: 'px',
    name: '测试店',
    category: '测试品类',
    perCapita: 50,
    distanceKm: 1,
    trendScore: 0.8,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    moods: ['happy'],
    scene: ['takeout', 'dineout'],
    source: 'hot',
    reason: '测试',
    ...overrides,
  };
}

describe('distanceFit 距离分档', () => {
  it('≤1km → 1.0', () => {
    expect(distanceFit.score(makePlace({ distanceKm: 0.5 }), makeCtx()).score).toBe(1);
    expect(distanceFit.score(makePlace({ distanceKm: 1 }), makeCtx()).score).toBe(1);
  });
  it('≤3km → 0.7', () => {
    expect(distanceFit.score(makePlace({ distanceKm: 2.5 }), makeCtx()).score).toBe(0.7);
  });
  it('≤5km → 0.4', () => {
    expect(distanceFit.score(makePlace({ distanceKm: 4 }), makeCtx()).score).toBe(0.4);
  });
  it('>5km → 0.2', () => {
    expect(distanceFit.score(makePlace({ distanceKm: 8 }), makeCtx()).score).toBe(0.2);
  });
});

describe('placeTrend / placeSeason / placeMood', () => {
  it('placeTrend 透传 trendScore', () => {
    expect(placeTrend.score(makePlace({ trendScore: 0.66 }), makeCtx()).score).toBe(0.66);
  });
  it('placeSeason 当月命中 → 1.0，否则 0.5', () => {
    expect(placeSeason.score(makePlace({ seasonMonths: [7] }), makeCtx()).score).toBe(1);
    expect(placeSeason.score(makePlace({ seasonMonths: [1] }), makeCtx()).score).toBe(0.5);
  });
  it('placeMood 心情命中 → 1.0，否则 0.4', () => {
    expect(placeMood.score(makePlace({ moods: ['relaxed'] }), makeCtx()).score).toBe(1);
    expect(placeMood.score(makePlace({ moods: ['happy'] }), makeCtx()).score).toBe(0.4);
  });
});

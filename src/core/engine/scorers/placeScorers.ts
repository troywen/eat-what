/**
 * 外卖/外出候选（PlaceCandidate）专用打分器：
 * distanceFit 距离、placeTrend 热度、placeSeason 时令、placeMood 心情场景。
 */
import type { PlaceCandidate, Scorer } from '../../types';
import { MOOD_LABEL } from './moodFit';

export const distanceFit: Scorer<PlaceCandidate> = {
  key: 'distanceFit',
  score(place) {
    const km = place.distanceKm;
    if (km <= 1) return { score: 1.0, reason: `只有 ${km}km，抬脚就到` };
    if (km <= 3) return { score: 0.7, reason: `${km}km，不算远` };
    if (km <= 5) return { score: 0.4, reason: `${km}km，稍微有点远` };
    return { score: 0.2, reason: `${km}km，跑一趟有点折腾` };
  },
};

export const placeTrend: Scorer<PlaceCandidate> = {
  key: 'placeTrend',
  score(place) {
    return {
      score: place.trendScore,
      reason: `人气 ${(place.trendScore * 100).toFixed(0)}%，最近很火`,
    };
  },
};

export const placeSeason: Scorer<PlaceCandidate> = {
  key: 'placeSeason',
  score(place, ctx) {
    const month = ctx.now.getMonth() + 1;
    if (place.seasonMonths.includes(month)) {
      return { score: 1.0, reason: `${month} 月正是吃这口的时候` };
    }
    return { score: 0.5, reason: `${month} 月吃它不算时令` };
  },
};

export const placeMood: Scorer<PlaceCandidate> = {
  key: 'placeMood',
  score(place, ctx) {
    if (place.moods.includes(ctx.mood)) {
      return { score: 1.0, reason: `适合${MOOD_LABEL[ctx.mood]}的时候去` };
    }
    return { score: 0.4, reason: `和${MOOD_LABEL[ctx.mood]}的心情不算绝配` };
  },
};

/**
 * 天气适配：冷天偏好热汤锅物，热天偏好凉拌清爽，雨雪天对热食额外加成。
 * 温度分档：<10°C 冷；10~26°C 温和（偏好 neutral/warm）；>26°C 热。
 */
import type { Recipe, Scorer, Warmth } from '../../types';

const COLD_PREF: Record<Warmth, number> = { hot: 1.0, warm: 0.8, neutral: 0.55, cool: 0.3, cold: 0.15 };
const MILD_PREF: Record<Warmth, number> = { hot: 0.75, warm: 0.9, neutral: 1.0, cool: 0.9, cold: 0.7 };
const HOT_PREF: Record<Warmth, number> = { hot: 0.2, warm: 0.45, neutral: 0.7, cool: 0.9, cold: 1.0 };

const WARMTH_LABEL: Record<Warmth, string> = {
  hot: '热乎的',
  warm: '温热的',
  neutral: '不温不凉的',
  cool: '清爽的',
  cold: '冰凉爽口的',
};

export const weatherFit: Scorer<Recipe> = {
  key: 'weatherFit',
  score(recipe, ctx) {
    const { tempC, condition } = ctx.weather;

    let pref: Record<Warmth, number>;
    let climate: string;
    if (tempC < 10) {
      pref = COLD_PREF;
      climate = '天冷';
    } else if (tempC <= 26) {
      pref = MILD_PREF;
      climate = '气温舒适';
    } else {
      pref = HOT_PREF;
      climate = '天热';
    }

    let score = pref[recipe.warmth];
    let reason = `${ctx.weather.tempC}°C ${climate}，${WARMTH_LABEL[recipe.warmth]}菜正合适`;

    // 雨雪天湿冷，热食额外加成
    if (condition === 'rainy' || condition === 'snowy') {
      if (recipe.warmth === 'hot') {
        score = Math.min(1, score + 0.2);
        reason += '；雨雪天，热食加分';
      } else if (recipe.warmth === 'warm') {
        score = Math.min(1, score + 0.1);
        reason += '；雨雪天，温热菜小加分';
      }
    }

    return { score, reason };
  },
};

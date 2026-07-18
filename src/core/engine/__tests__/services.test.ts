/**
 * 服务层测试：高德 URI 生成与天气文字映射。
 */
import { describe, expect, it } from 'vitest';
import { buildAmapUri } from '../../services/amap';
import { mapAmapWeather } from '../../services/weather';

describe('buildAmapUri', () => {
  it('使用官方 uri.amap.com/search 端点', () => {
    const url = buildAmapUri('海底捞火锅');
    expect(url.startsWith('https://uri.amap.com/search?')).toBe(true);
  });

  it('中文关键词正确编码且可被解析还原', () => {
    const url = buildAmapUri('海底捞火锅（万象城店）');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('keyword')).toBe('海底捞火锅（万象城店）');
    expect(parsed.searchParams.get('src')).toBe('eatwhat');
  });

  it('特殊字符（间隔号、括号）不会破坏链接结构', () => {
    const url = buildAmapUri('串烧研究所·烤串精酿');
    expect(url).not.toContain('·');
    expect(new URL(url).searchParams.get('keyword')).toBe('串烧研究所·烤串精酿');
  });
});

describe('mapAmapWeather', () => {
  it('雪类天气 → snowy', () => {
    expect(mapAmapWeather('小雪')).toBe('snowy');
    expect(mapAmapWeather('雨夹雪')).toBe('snowy');
  });

  it('雨类天气 → rainy', () => {
    expect(mapAmapWeather('小雨')).toBe('rainy');
    expect(mapAmapWeather('雷阵雨')).toBe('rainy');
    expect(mapAmapWeather('暴雨')).toBe('rainy');
  });

  it('晴 → sunny', () => {
    expect(mapAmapWeather('晴')).toBe('sunny');
  });

  it('阴/多云/雾霾 → cloudy', () => {
    expect(mapAmapWeather('阴')).toBe('cloudy');
    expect(mapAmapWeather('多云')).toBe('cloudy');
    expect(mapAmapWeather('霾')).toBe('cloudy');
  });

  it('雨雪混合优先判雪（更冷）', () => {
    expect(mapAmapWeather('雨夹雪')).toBe('snowy');
  });
});

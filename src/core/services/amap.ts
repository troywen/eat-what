/**
 * 高德地图服务抽象。
 * Demo 阶段：mockAmapService 返回内置「扫街榜」数据（data/places.ts 中 source==='amap-rank'）。
 * 说明：高德「扫街榜」目前是高德 App 内功能，开放平台未提供公开榜单 API；
 * 生产环境可用 POI 搜索 API（https://restapi.amap.com/v3/place/text，格式经官方文档核验）
 * 按品类拉取真实商户替代，API Key 通过环境变量注入（VITE_AMAP_KEY），切勿硬编码进仓库。
 */
import type { PlaceCandidate } from '../types';
import { PLACES } from '../data/places';

export interface AmapService {
  getStreetRank(city: string): Promise<PlaceCandidate[]>;
}

export const mockAmapService: AmapService = {
  async getStreetRank(_city: string): Promise<PlaceCandidate[]> {
    return PLACES.filter((p) => p.source === 'amap-rank');
  },
};

/**
 * 生成高德 URI 跳转链接（直接唤起高德 App / Web 搜索该店）。
 * 格式经官方 URI API 文档核验：https://uri.amap.com/search?keyword={词}&src={来源}
 * 实测 302 → https://ditu.amap.com/search?query={词}（PC/移动端均可用）。
 */
export function buildAmapUri(name: string): string {
  const params = new URLSearchParams({ keyword: name, src: 'eatwhat' });
  return `https://uri.amap.com/search?${params.toString()}`;
}

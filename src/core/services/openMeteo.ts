/**
 * Open-Meteo 实时天气（免费、免 Key、CORS 开放）。
 * https://open-meteo.com/en/docs
 * GET /v1/forecast?latitude=..&longitude=..&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto
 *
 * 附带 BigDataCloud 免费反向地理（免 Key），用于把坐标翻译成城市名；
 * 该增强允许失败/超时，静默返回 null，绝不影响天气主链路。
 */
import type { Weather, WeatherCondition } from '../types';
import type { WeatherService } from './weather';

export interface Coords {
  latitude: number;
  longitude: number;
}

/** 定位不可用时的默认坐标：上海。 */
export const DEFAULT_COORDS: Coords = { latitude: 31.2304, longitude: 121.4737 };

/** 最小 fetch 形状：便于测试注入 stub。 */
export type FetchLike = (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

/**
 * WMO weather_code → 内部 WeatherCondition + 中文描述。
 * https://open-meteo.com/en/docs（WMO Weather interpretation codes）
 */
export function mapWmoCode(code: number): { condition: WeatherCondition; description: string } {
  if (code === 0) return { condition: 'sunny', description: '晴' };
  if (code === 1 || code === 2) return { condition: 'sunny', description: '晴间多云' };
  if (code === 3) return { condition: 'cloudy', description: '阴' };
  if (code === 45 || code === 48) return { condition: 'cloudy', description: '雾' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'rainy', description: '毛毛雨' };
  if ([61, 63, 65, 66, 67].includes(code)) return { condition: 'rainy', description: '雨' };
  if ([71, 73, 75, 77].includes(code)) return { condition: 'snowy', description: '雪' };
  if ([80, 81, 82].includes(code)) return { condition: 'rainy', description: '阵雨' };
  if (code === 85 || code === 86) return { condition: 'snowy', description: '阵雪' };
  if ([95, 96, 99].includes(code)) return { condition: 'rainy', description: '雷暴' };
  return { condition: 'cloudy', description: '多云' }; // 未知码保守按多云
}

interface OpenMeteoResp {
  error?: boolean;
  reason?: string;
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
}

/** 以坐标创建 Open-Meteo 实时天气服务；fetch 可注入便于测试。 */
export function createOpenMeteoService(coords: Coords, fetchImpl: FetchLike = fetch): WeatherService {
  return {
    async getCurrent(): Promise<Weather> {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
      const resp = await fetchImpl(url);
      if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`);
      const data = (await resp.json()) as OpenMeteoResp;
      if (data.error) throw new Error(`Open-Meteo 返回错误：${data.reason ?? '未知原因'}`);
      const cur = data.current;
      if (
        typeof cur?.temperature_2m !== 'number' ||
        typeof cur.relative_humidity_2m !== 'number' ||
        typeof cur.weather_code !== 'number'
      ) {
        throw new Error('Open-Meteo 返回缺少 current 必要字段');
      }
      const { condition, description } = mapWmoCode(cur.weather_code);
      return {
        tempC: cur.temperature_2m,
        condition,
        humidity: cur.relative_humidity_2m,
        description,
        isMock: false,
      };
    },
  };
}

interface BdcReverseResp {
  city?: string;
  locality?: string;
}

/**
 * 坐标 → 城市名（BigDataCloud 免费反向地理，中文）。
 * 增强能力：失败 / 超时 / 空结果一律静默返回 null，绝不 throw。
 */
export async function reverseGeocode(
  coords: Coords,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 4000,
): Promise<string | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=zh`;
    const result = await Promise.race([
      (async (): Promise<string | null> => {
        const resp = await fetchImpl(url);
        if (!resp.ok) return null;
        const data = (await resp.json()) as BdcReverseResp;
        const city = (data.city || data.locality || '').trim();
        return city || null;
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return result;
  } catch {
    return null;
  }
}

/** 浏览器定位：成功返回坐标；不可用 / 被拒 / 超时返回 null（绝不 throw）。 */
export function getBrowserCoords(timeoutMs = 5000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs },
    );
  });
}

/**
 * 天气服务抽象。
 * Demo 阶段：mockWeatherService 按当前月份/小时启发式生成合理天气（isMock: true）。
 * 生产环境：amapWeatherService 已实现高德天气 API（格式经官方文档核验），
 * 配置 VITE_AMAP_KEY 与 VITE_AMAP_CITY（城市 adcode）后自动切换，无需改代码。
 */
import type { MealSlot, Weather, WeatherCondition } from '../types';

export interface WeatherService {
  getCurrent(): Promise<Weather>;
}

/**
 * 由小时推导餐段：5-9 breakfast，10-14 lunch，16-20 dinner，21-4 lateNight。
 * 15 点（午后）并入 lunch 档末尾。
 */
export function getMealSlot(d: Date): MealSlot {
  const h = d.getHours();
  if (h >= 5 && h <= 9) return 'breakfast';
  if (h >= 10 && h <= 15) return 'lunch';
  if (h >= 16 && h <= 20) return 'dinner';
  return 'lateNight';
}

/** 月度气候启发式基准（大致对应华东地区）。 */
const MONTH_BASE: Record<number, { tempC: number; condition: WeatherCondition; humidity: number; description: string }> = {
  1: { tempC: 3, condition: 'cloudy', humidity: 55, description: '晴冷干燥' },
  2: { tempC: 6, condition: 'cloudy', humidity: 60, description: '阴冷，偶有倒春寒' },
  3: { tempC: 11, condition: 'cloudy', humidity: 65, description: '初春微凉' },
  4: { tempC: 17, condition: 'sunny', humidity: 65, description: '春暖，阳光正好' },
  5: { tempC: 22, condition: 'sunny', humidity: 70, description: '温暖渐热' },
  6: { tempC: 26, condition: 'rainy', humidity: 85, description: '梅雨连绵，闷湿' },
  7: { tempC: 32, condition: 'sunny', humidity: 75, description: '盛夏酷暑' },
  8: { tempC: 31, condition: 'rainy', humidity: 78, description: '闷热，午后雷阵雨' },
  9: { tempC: 26, condition: 'sunny', humidity: 70, description: '秋老虎余威' },
  10: { tempC: 19, condition: 'sunny', humidity: 62, description: '秋高气爽' },
  11: { tempC: 12, condition: 'cloudy', humidity: 60, description: '深秋转凉' },
  12: { tempC: 5, condition: 'snowy', humidity: 58, description: '入冬，湿冷飘雪' },
};

export const mockWeatherService: WeatherService = {
  async getCurrent(): Promise<Weather> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const hour = now.getHours();
    const base = MONTH_BASE[month] ?? MONTH_BASE[1];
    // 深夜/凌晨比白天低约 3°C
    const nightDip = hour >= 21 || hour <= 5 ? -3 : 0;
    return {
      tempC: base.tempC + nightDip,
      condition: base.condition,
      humidity: base.humidity,
      description: base.description,
      isMock: true,
    };
  },
};

/* ------------------------------------------------------------------ *
 * 真实天气：高德 Web 服务天气 API（格式经官方文档核验）
 * GET https://restapi.amap.com/v3/weather/weatherInfo?key={key}&city={adcode}&extensions=base
 * 返回 { status, lives: [{ weather, temperature, humidity, winddirection, windpower, reporttime }] }
 * 注意：浏览器直连会暴露 Key，生产环境应经由自有服务端代理转发。
 * ------------------------------------------------------------------ */

const AMAP_KEY: string | undefined = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_AMAP_KEY;
const AMAP_CITY: string | undefined = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_AMAP_CITY;

/** 高德天气文字 → 内部 WeatherCondition 枚举。 */
export function mapAmapWeather(text: string): WeatherCondition {
  if (/雪/.test(text)) return 'snowy';
  if (/雨|雷|冰雹/.test(text)) return 'rainy';
  if (/晴/.test(text)) return 'sunny';
  return 'cloudy'; // 阴、多云、雾、霾等
}

interface AmapWeatherResp {
  status: string;
  lives?: Array<{ weather: string; temperature: string; humidity: string }>;
}

export const amapWeatherService: WeatherService = {
  async getCurrent(): Promise<Weather> {
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${AMAP_KEY}&city=${AMAP_CITY}&extensions=base`;
    const resp = (await (await fetch(url)).json()) as AmapWeatherResp;
    if (resp.status !== '1' || !resp.lives?.length) {
      throw new Error('高德天气接口返回异常');
    }
    const live = resp.lives[0];
    return {
      tempC: Number(live.temperature),
      condition: mapAmapWeather(live.weather),
      humidity: Number(live.humidity),
      description: live.weather,
      isMock: false,
    };
  },
};

/** 服务选择：配了高德 Key 用真实天气，否则回落 Mock。 */
export function getWeatherService(): WeatherService {
  return AMAP_KEY && AMAP_CITY ? amapWeatherService : mockWeatherService;
}

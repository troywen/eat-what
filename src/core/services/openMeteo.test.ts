/**
 * Open-Meteo 服务测试：WMO 码映射、fetch stub 成功解析、错误路径 throw、反向地理静默失败。
 */
import { describe, expect, it, vi } from 'vitest';
import {
  createOpenMeteoService,
  mapWmoCode,
  reverseGeocode,
  type Coords,
  type FetchLike,
} from './openMeteo';

const COORDS: Coords = { latitude: 31.23, longitude: 121.47 };

const VALID_BODY = {
  current: { temperature_2m: 27.7, relative_humidity_2m: 89, weather_code: 80 },
};

/** 构造 fetch stub：默认 200 + 给定 body。 */
function stubFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.fn(async (_url: string) => ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  })) as unknown as FetchLike & ReturnType<typeof vi.fn>;
}

describe('mapWmoCode', () => {
  it('0 → sunny 晴', () => {
    expect(mapWmoCode(0)).toEqual({ condition: 'sunny', description: '晴' });
  });

  it('1/2 → sunny 晴间多云', () => {
    expect(mapWmoCode(1).condition).toBe('sunny');
    expect(mapWmoCode(2).condition).toBe('sunny');
    expect(mapWmoCode(1).description).toBe('晴间多云');
  });

  it('3 → cloudy 阴', () => {
    expect(mapWmoCode(3)).toEqual({ condition: 'cloudy', description: '阴' });
  });

  it('45/48 → cloudy 雾', () => {
    expect(mapWmoCode(45)).toEqual({ condition: 'cloudy', description: '雾' });
    expect(mapWmoCode(48).condition).toBe('cloudy');
  });

  it('51/53/55/56/57 → rainy 毛毛雨', () => {
    for (const code of [51, 53, 55, 56, 57]) {
      expect(mapWmoCode(code), `code=${code}`).toEqual({ condition: 'rainy', description: '毛毛雨' });
    }
  });

  it('61/63/65/66/67 → rainy 雨', () => {
    for (const code of [61, 63, 65, 66, 67]) {
      expect(mapWmoCode(code), `code=${code}`).toEqual({ condition: 'rainy', description: '雨' });
    }
  });

  it('71/73/75/77 → snowy 雪', () => {
    for (const code of [71, 73, 75, 77]) {
      expect(mapWmoCode(code), `code=${code}`).toEqual({ condition: 'snowy', description: '雪' });
    }
  });

  it('80/81/82 → rainy 阵雨', () => {
    for (const code of [80, 81, 82]) {
      expect(mapWmoCode(code), `code=${code}`).toEqual({ condition: 'rainy', description: '阵雨' });
    }
  });

  it('85/86 → snowy 阵雪', () => {
    expect(mapWmoCode(85)).toEqual({ condition: 'snowy', description: '阵雪' });
    expect(mapWmoCode(86).condition).toBe('snowy');
  });

  it('95/96/99 → rainy 雷暴', () => {
    for (const code of [95, 96, 99]) {
      expect(mapWmoCode(code), `code=${code}`).toEqual({ condition: 'rainy', description: '雷暴' });
    }
  });

  it('未知码 → cloudy 多云', () => {
    for (const code of [4, 50, 100, -1]) {
      expect(mapWmoCode(code), `code=${code}`).toEqual({ condition: 'cloudy', description: '多云' });
    }
  });
});

describe('createOpenMeteoService', () => {
  it('成功解析 current 字段并映射 WMO 码，isMock=false', async () => {
    const svc = createOpenMeteoService(COORDS, stubFetch(VALID_BODY));
    await expect(svc.getCurrent()).resolves.toEqual({
      tempC: 27.7,
      condition: 'rainy', // weather_code 80 → 阵雨
      humidity: 89,
      description: '阵雨',
      isMock: false,
    });
  });

  it('请求 URL 携带坐标与 current 参数', async () => {
    const f = stubFetch(VALID_BODY);
    await createOpenMeteoService(COORDS, f).getCurrent();
    const url = f.mock.calls[0][0] as string;
    expect(url).toContain('latitude=31.23');
    expect(url).toContain('longitude=121.47');
    expect(url).toContain('current=temperature_2m,relative_humidity_2m,weather_code');
    expect(url).toContain('timezone=auto');
  });

  it('HTTP 非 200 → throw', async () => {
    const svc = createOpenMeteoService(COORDS, stubFetch({}, { ok: false, status: 500 }));
    await expect(svc.getCurrent()).rejects.toThrow('500');
  });

  it('返回体含 error → throw', async () => {
    const svc = createOpenMeteoService(COORDS, stubFetch({ error: true, reason: 'latitude invalid' }));
    await expect(svc.getCurrent()).rejects.toThrow('latitude invalid');
  });

  it('current 字段缺失 / 不完整 → throw', async () => {
    await expect(createOpenMeteoService(COORDS, stubFetch({})).getCurrent()).rejects.toThrow();
    await expect(
      createOpenMeteoService(COORDS, stubFetch({ current: { temperature_2m: 20 } })).getCurrent(),
    ).rejects.toThrow();
    await expect(
      createOpenMeteoService(
        COORDS,
        stubFetch({ current: { temperature_2m: 20, relative_humidity_2m: 60 } }),
      ).getCurrent(),
    ).rejects.toThrow();
  });

  it('fetch 本身抛错 → 向外抛（由调用方降级）', async () => {
    const boom = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as FetchLike;
    await expect(createOpenMeteoService(COORDS, boom).getCurrent()).rejects.toThrow('network down');
  });
});

describe('reverseGeocode', () => {
  it('优先取 city', async () => {
    const f = stubFetch({ city: '上海市', locality: '黄浦区' });
    await expect(reverseGeocode(COORDS, f)).resolves.toBe('上海市');
  });

  it('无 city 时退 locality', async () => {
    const f = stubFetch({ locality: '黄浦区' });
    await expect(reverseGeocode(COORDS, f)).resolves.toBe('黄浦区');
  });

  it('city/locality 均为空 → null', async () => {
    await expect(reverseGeocode(COORDS, stubFetch({}))).resolves.toBeNull();
    await expect(reverseGeocode(COORDS, stubFetch({ city: '  ' }))).resolves.toBeNull();
  });

  it('HTTP 失败 → null（不 throw）', async () => {
    const f = stubFetch({}, { ok: false, status: 502 });
    await expect(reverseGeocode(COORDS, f)).resolves.toBeNull();
  });

  it('fetch 抛错 → null（不 throw）', async () => {
    const boom = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as FetchLike;
    await expect(reverseGeocode(COORDS, boom)).resolves.toBeNull();
  });

  it('超时 → null（不 throw）', async () => {
    const hanging = vi.fn(() => new Promise<never>(() => {})) as unknown as FetchLike;
    await expect(reverseGeocode(COORDS, hanging, 50)).resolves.toBeNull();
  });
});

import { useCallback, useEffect, useState } from 'react'
import { amapWeatherService, hasAmapWeatherConfig, mockWeatherService } from '../core/services/weather'
import {
  createOpenMeteoService,
  DEFAULT_COORDS,
  getBrowserCoords,
  reverseGeocode,
} from '../core/services/openMeteo'
import type { Weather, WeatherCondition } from '../core/types'

/** 「自己填天气」表单提交的手动天气输入。 */
export interface ManualWeatherInput {
  tempC: number
  condition: WeatherCondition
  humidity?: number
}

const CONDITIONS: readonly WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'snowy']

/** 手动天气缺省湿度：sunny 45 / cloudy 60 / rainy 85 / snowy 70。 */
const DEFAULT_HUMIDITY: Record<WeatherCondition, number> = {
  sunny: 45,
  cloudy: 60,
  rainy: 85,
  snowy: 70,
}

/** 手动天气描述：大晴天 / 多云 / 下雨 / 下雪。 */
const DEFAULT_DESCRIPTION: Record<WeatherCondition, string> = {
  sunny: '大晴天',
  cloudy: '多云',
  rainy: '下雨',
  snowy: '下雪',
}

/** 手动温度合法区间：[-40, 50]，超出夹取到边界。 */
const TEMP_MIN = -40
const TEMP_MAX = 50

/**
 * 自动天气降级链：高德（有 Key）> Open-Meteo 实时（定位坐标，失败用默认上海坐标）> mock。
 * Open-Meteo 成功即为真实天气（isMock: false）；默认坐标时 city 标「上海（默认）」。
 */
async function fetchAutoWeather(): Promise<Weather> {
  if (hasAmapWeatherConfig()) {
    try {
      return await amapWeatherService.getCurrent()
    } catch {
      return mockWeatherService.getCurrent()
    }
  }
  const browserCoords = await getBrowserCoords(5000)
  const coords = browserCoords ?? DEFAULT_COORDS
  try {
    const [weather, city] = await Promise.all([
      createOpenMeteoService(coords).getCurrent(),
      // 默认坐标不查反向地理，直接标注；定位成功才查城市名
      browserCoords ? reverseGeocode(coords) : Promise.resolve(null),
    ])
    return { ...weather, city: city ?? (browserCoords ? undefined : '上海（默认）') }
  } catch {
    return mockWeatherService.getCurrent()
  }
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  /** 当前天气是否为用户手动填写（控制贴纸「手动」角标与「恢复自动」入口）。 */
  const [isManual, setIsManual] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setWeather(await fetchAutoWeather())
      setIsManual(false)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 手动填天气：温度须为有限数并夹取到 [-40, 50]，状况限四选一，
   * 湿度缺省按状况给；任一非法直接拒绝（返回 false）。isMock 保持 true。
   */
  const setManual = useCallback((input: ManualWeatherInput): boolean => {
    if (!Number.isFinite(input.tempC)) return false
    if (!CONDITIONS.includes(input.condition)) return false
    const tempC = Math.min(TEMP_MAX, Math.max(TEMP_MIN, input.tempC))
    const humidity =
      input.humidity !== undefined && Number.isFinite(input.humidity)
        ? Math.min(100, Math.max(0, Math.round(input.humidity)))
        : DEFAULT_HUMIDITY[input.condition]
    setWeather({
      tempC,
      condition: input.condition,
      humidity,
      description: DEFAULT_DESCRIPTION[input.condition],
      isMock: true,
    })
    setIsManual(true)
    return true
  }, [])

  /** 恢复自动：重走降级链（高德 > Open-Meteo > mock）。 */
  const resetToAuto = useCallback(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { weather, loading, isManual, refresh, setManual, resetToAuto }
}

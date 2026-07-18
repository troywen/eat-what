import { useCallback, useEffect, useState } from 'react'
import { getWeatherService } from '../core/services/weather'
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

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  /** 当前天气是否为用户手动填写（控制贴纸「手动」角标与「恢复自动」入口）。 */
  const [isManual, setIsManual] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setWeather(await getWeatherService().getCurrent())
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

  /** 恢复自动：重新走天气服务（mock 启发式 / 高德 API）生成天气。 */
  const resetToAuto = useCallback(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { weather, loading, isManual, refresh, setManual, resetToAuto }
}

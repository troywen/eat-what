import { useState } from 'react'
import { Droplets, Pencil, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMealSlot } from '../core/services/weather'
import type { Weather, WeatherCondition } from '../core/types'
import { CONDITION_META, SLOT_LABEL } from './labels'

interface HeroProps {
  weather: Weather | null
  loading: boolean
  /** 当前天气是否为用户手动填写 */
  isManual: boolean
  onRefresh: () => void
  /** 「自己填天气」：提交手动天气，非法输入返回 false */
  onSetManual: (input: { tempC: number; condition: WeatherCondition; humidity?: number }) => boolean
  /** 恢复自动生成天气 */
  onResetAuto: () => void
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 手动天气状况贴纸（单选）：☀️晴 / ⛅多云 / 🌧️下雨 / ❄️下雪。 */
const CONDITION_OPTIONS: { value: WeatherCondition; label: string; emoji: string }[] = [
  { value: 'sunny', label: '晴', emoji: '☀️' },
  { value: 'cloudy', label: '多云', emoji: '⛅' },
  { value: 'rainy', label: '下雨', emoji: '🌧️' },
  { value: 'snowy', label: '下雪', emoji: '❄️' },
]

export default function Hero({ weather, loading, isManual, onRefresh, onSetManual, onResetAuto }: HeroProps) {
  const now = new Date()
  const slot = getMealSlot(now)
  const dateLine = `${now.getMonth() + 1}月${now.getDate()}日 · ${WEEKDAYS[now.getDay()]} · ${SLOT_LABEL[slot]}时间`
  const meta = weather ? CONDITION_META[weather.condition] : null

  // 「自己填天气」小便签表单
  const [formOpen, setFormOpen] = useState(false)
  const [tempInput, setTempInput] = useState('')
  const [condition, setCondition] = useState<WeatherCondition>('sunny')
  const [tempError, setTempError] = useState(false)

  const toggleForm = () => {
    if (!formOpen) {
      // 打开时带上当前状况，温度留空让用户自己写
      setTempInput('')
      setCondition(weather?.condition ?? 'sunny')
      setTempError(false)
    }
    setFormOpen((o) => !o)
  }

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const tempC = Number(tempInput)
    if (tempInput.trim() === '' || !Number.isFinite(tempC)) {
      setTempError(true)
      return
    }
    if (!onSetManual({ tempC, condition })) {
      setTempError(true)
      return
    }
    setTempError(false)
    setFormOpen(false)
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-12 pb-8 text-center sm:pt-16">
      {/* 手账封面大标题 + 和纸胶带角 */}
      <div className="relative inline-block">
        <span className="washi-tape -top-3 -left-8 rotate-[-14deg] bg-rose-300/70" />
        <span className="washi-tape -right-9 -bottom-2 rotate-[10deg] bg-emerald-300/70" />
        <h1 className="font-display text-5xl text-orange-950 sm:text-6xl">
          等一下吃什么
        </h1>
      </div>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        翻到这一页，三秒决定今天吃什么 🍳
      </p>

      {/* 日记开头：日期行 */}
      <div className="mt-5 inline-flex items-center gap-2 border-b-2 border-dashed border-orange-300/70 pb-1 text-sm font-semibold tracking-wide text-orange-900/80">
        📖 {dateLine}
      </div>

      {/* 今日天气贴纸 */}
      <div className="mt-6 flex justify-center">
        <div className="sticky-card relative inline-flex rotate-[-1.5deg] items-center gap-3 px-5 py-3.5 transition-transform duration-300 hover:rotate-0">
          <span className="washi-tape -top-3 left-1/2 w-16 -translate-x-1/2 rotate-[3deg] bg-sky-300/70" />
          {isManual && (
            <div className="absolute -top-3 -right-3 flex rotate-6 flex-col items-center gap-0.5">
              <span className="rounded-full bg-orange-700 px-1.5 py-0.5 text-[9px] font-bold text-amber-50 shadow-sm">
                手动
              </span>
              <button
                type="button"
                onClick={onResetAuto}
                className="text-[9px] text-muted-foreground underline underline-offset-2 hover:text-orange-800"
              >
                恢复自动
              </button>
            </div>
          )}
          <span className="text-3xl">{meta?.emoji ?? '⏳'}</span>
          <div className="text-left">
            <div className="flex items-center gap-2 font-bold text-orange-950">
              {loading && !weather ? '天气加载中…' : `${weather?.tempC ?? '--'}°C ${meta?.label ?? ''}`}
              {weather?.isMock && (
                <span className="text-[10px] font-normal text-muted-foreground">（模拟）</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Droplets className="h-3 w-3" /> 湿度 {weather?.humidity ?? '--'}%
              </span>
              <span>{weather?.description ?? ''}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="ml-1 h-7 px-2 text-xs text-muted-foreground hover:text-orange-800"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {weather?.isMock && (
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleForm}
                className="h-7 px-2 text-xs text-orange-800 hover:text-orange-900"
                title="天气不准？自己填一个"
              >
                <Pencil className="h-3 w-3" />
                自己填天气
              </Button>
              <span className="-mt-1 text-[9px] text-muted-foreground">更准一点</span>
            </div>
          )}
        </div>
      </div>

      {/* 「自己填天气」小便签表单 */}
      {formOpen && weather?.isMock && (
        <div className="mt-3 flex justify-center">
          <form
            onSubmit={submitManual}
            className="sticky-card relative rotate-[1deg] px-5 pt-4 pb-3 text-left"
          >
            <span className="washi-tape -top-3 left-1/2 w-14 -translate-x-1/2 rotate-[-4deg] bg-amber-300/70" />
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={tempInput}
                onChange={(e) => {
                  setTempInput(e.target.value)
                  setTempError(false)
                }}
                placeholder="现在多少度？"
                min={-40}
                max={50}
                className="w-32 rounded-lg border-2 border-dashed border-orange-300/80 bg-amber-50/60 px-2.5 py-1.5 text-sm font-semibold text-orange-950 placeholder:font-normal placeholder:text-muted-foreground focus:border-orange-500 focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground">°C（-40 ~ 50）</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCondition(opt.value)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                    condition === opt.value
                      ? 'rotate-[-2deg] border-orange-500 bg-orange-200/90 font-bold text-orange-950 shadow-sm'
                      : 'border-orange-200 bg-amber-50/50 text-muted-foreground hover:border-orange-400 hover:text-orange-900'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                className="h-7 rounded-lg bg-orange-800 px-3 text-xs text-amber-50 shadow-[0_2px_0_0_rgba(96,50,20,0.55)] hover:bg-orange-900 active:translate-y-0.5 active:shadow-none"
              >
                贴上
              </Button>
              {tempError && <span className="text-xs font-semibold text-red-600">填个温度先</span>}
            </div>
          </form>
        </div>
      )}

      {weather && (
        <p className="mt-3 text-xs text-muted-foreground">
          天气也会写进今天的菜谱：冷天多汤锅，热天多凉拌 ☁️
        </p>
      )}
    </section>
  )
}

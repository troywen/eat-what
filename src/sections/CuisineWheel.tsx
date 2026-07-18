import { useMemo, useRef, useState } from 'react'
import { CUISINES } from '../lib/cuisines'
import { cn } from '@/lib/utils'

interface CuisineWheelProps {
  /** 当前选中的菜系（转盘停下或手动点选） */
  selected: string | null
  onSelect: (cuisine: string | null) => void
}

const SEGMENT = 360 / CUISINES.length // 每格 30°
const CHIP_TILTS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2', '-rotate-[0.5deg]', 'rotate-[1.5deg]']

/** 手账纸转盘：12 格交替奶白/便签黄，顶部 ▼ 指针，中心焦糖棕圆钮。 */
export default function CuisineWheel({ selected, onSelect }: CuisineWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState<string | null>(null) // toast 贴纸用
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 12 格交替色的 conic-gradient
  const wheelBg = useMemo(() => {
    const stops: string[] = []
    CUISINES.forEach((_, i) => {
      const color = i % 2 === 0 ? '#FFFDF6' : '#FCEFC7' // 奶白 / 便签黄
      stops.push(`${color} ${i * SEGMENT}deg ${(i + 1) * SEGMENT}deg`)
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [])

  const spin = () => {
    if (spinning) return
    const target = Math.floor(Math.random() * CUISINES.length)
    // 让第 target 格中心转到顶部指针：目标角度 ≡ -(target*30 + 15)
    const desired = -(target * SEGMENT + SEGMENT / 2)
    const delta = ((desired - rotation) % 360 + 360) % 360
    const next = rotation + 5 * 360 + delta // 多转 5 圈减速停下
    setSpinning(true)
    setLanded(null)
    setRotation(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const name = CUISINES[target].name
      setSpinning(false)
      setLanded(name)
      onSelect(name)
      timerRef.current = setTimeout(() => setLanded(null), 2600)
    }, 3700) // 略长于 3.5s transition
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-8">
      <div className="sticky-card relative rotate-[0.4deg] p-6 text-center sm:p-8">
        <span className="washi-tape -top-3 left-10 rotate-[-6deg] bg-rose-300/70" />
        <h2 className="font-display text-2xl text-orange-950">不知道吃啥菜系？转一下 🎡</h2>
        <p className="mt-1 text-sm text-muted-foreground">转到啥吃啥，或者直接点下面的贴纸选</p>

        <div className="relative mx-auto mt-6 h-64 w-64 select-none sm:h-72 sm:w-72">
          {/* 顶部指针贴纸 */}
          <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rotate-1 text-2xl drop-shadow-sm">▼</div>

          {/* 转盘本体 */}
          <div
            className="h-full w-full rounded-full border-4 border-orange-900/15 shadow-[0_8px_20px_rgba(120,60,20,0.18)]"
            style={{
              background: wheelBg,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 3.5s cubic-bezier(0.15, 0.9, 0.25, 1)' : 'none',
            }}
          >
            {CUISINES.map((c, i) => (
              <span
                key={c.name}
                className="absolute top-1/2 left-1/2 text-[11px] font-semibold text-orange-950/80"
                style={{
                  transform: `translate(-50%, -50%) rotate(${i * SEGMENT + SEGMENT / 2}deg) translateY(-86px)`,
                  writingMode: 'vertical-rl',
                }}
              >
                {c.name}
              </span>
            ))}
          </div>

          {/* 中心圆钮 */}
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="font-display absolute top-1/2 left-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orange-800 text-lg text-amber-50 shadow-[0_4px_0_0_rgba(96,50,20,0.55)] transition-all hover:bg-orange-900 active:translate-y-[calc(-50%+2px)] active:shadow-none disabled:opacity-80"
          >
            {spinning ? '…' : '转！'}
          </button>

          {/* 停下后的 toast 贴纸 */}
          {landed && (
            <div className="sticky-card-yellow absolute -bottom-3 left-1/2 z-20 -translate-x-1/2 rotate-[-2deg] px-4 py-1.5 text-sm font-bold whitespace-nowrap text-orange-950 shadow-lg">
              今晚吃 {landed}！🎉
            </div>
          )}
        </div>

        {/* 12 个菜系贴纸 chips：直接点选 */}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {CUISINES.map((c, i) => {
            const active = selected === c.name
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelect(active ? null : c.name)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                  CHIP_TILTS[i % CHIP_TILTS.length],
                  active
                    ? 'scale-105 rotate-0 border-orange-800/40 bg-orange-800 font-bold text-amber-50 shadow-md'
                    : 'border-amber-600/25 bg-amber-100 text-orange-950',
                )}
              >
                {c.emoji} {c.name}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { ChevronDown, Clock, Flame, MapPin, NotebookPen, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { buildAmapUri } from '../core/services/amap'
import { getVideoGuides } from '../core/services/video'
import { getMealSlot } from '../core/services/weather'
import { scaleAmount } from '../core/engine/scaleAmount'
import { missingIngredients } from '../core/engine/scorers/ingredientMatch'
import type {
  Mood,
  PlaceCandidate,
  RecommendResult,
  Recommendation,
  Recipe,
  ScoreBreakdown,
  Weather,
} from '../core/types'
import { buildOpeningLine } from './openingLine'
import { DIFFICULTY_LABEL, SCORER_LABEL, SOURCE_META } from './labels'
import { cn } from '@/lib/utils'

interface ResultsProps {
  result: RecommendResult | null
  weather: Weather | null
  mood: Mood
  onShuffle: () => void
  /** 「就它了，记一笔」：上报菜名/店名与预填备注 */
  onLog: (dishName: string, note: string) => void
  /** 用户已选食材（缺料清单用） */
  userIngredients: string[]
  /** 吃饭人数（用量缩放用） */
  people: number
}

/** 契合度印章：小巧虚线圆标，旋转 -8° */
function ScoreSeal({ score }: { score: number }) {
  return (
    <div className="flex h-16 w-16 shrink-0 rotate-[-8deg] flex-col items-center justify-center rounded-full border-2 border-dashed border-[#D9500B]/60 bg-[#D9500B]/5 shadow-sm">
      <span className="text-[10px] font-semibold text-[#D9500B]/80">契合度</span>
      <span className="text-sm font-extrabold text-[#D9500B]">{Math.round(score * 100)}%</span>
    </div>
  )
}

function BreakdownBars({ breakdown }: { breakdown: ScoreBreakdown[] }) {
  return (
    <div className="space-y-2.5">
      {breakdown.map((b) => (
        <div key={b.scorerKey}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-orange-950/80">
              {SCORER_LABEL[b.scorerKey] ?? b.scorerKey}
              <span className="ml-1.5 text-muted-foreground">权重 {Math.round(b.weight * 100)}%</span>
            </span>
            <span className="font-bold text-orange-800">{Math.round(b.rawScore * 100)}</span>
          </div>
          <Progress value={b.rawScore * 100} className="mt-1 h-1.5 bg-orange-100" />
          {b.reason && <div className="mt-0.5 text-xs text-muted-foreground">{b.reason}</div>}
        </div>
      ))}
    </div>
  )
}

/** 打分折叠区：「为什么推荐它 ▾」（阻止冒泡，避免触发卡片点击） */
function WhyDetails({ breakdown }: { breakdown: ScoreBreakdown[] }) {
  return (
    <details
      className="group mt-4 border-t-2 border-dashed border-orange-200/80 pt-3"
      onClick={(e) => e.stopPropagation()}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-orange-800 select-none">
        <NotebookPen className="h-4 w-4" />
        为什么推荐它
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-3">
        <BreakdownBars breakdown={breakdown} />
      </div>
    </details>
  )
}

export default function Results({ result, weather, mood, onShuffle, onLog, userIngredients, people }: ResultsProps) {
  const [openRecipe, setOpenRecipe] = useState<Recommendation<Recipe> | null>(null)

  if (!result) return null

  const isCook = result.mode === 'cook'
  const items = isCook ? result.recipes : result.places

  if (items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 pt-10 text-center text-muted-foreground">
        候选都被你最近吃过啦，换个模式或者明天再来翻翻这一页～
      </section>
    )
  }

  const openingLine = weather
    ? buildOpeningLine({ mode: result.mode, weather, mood, slot: getMealSlot(new Date()), top: items[0] })
    : null

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-10">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="font-display text-3xl text-orange-950">
          {isCook ? '今天就做这几道 🍳' : result.mode === 'takeout' ? '外卖就选这几家 🛵' : '出门就去这几家 🥢'}
        </h2>
        <button
          type="button"
          onClick={onShuffle}
          className="font-display border-b-2 border-dashed border-orange-400/0 pb-0.5 text-sm text-orange-800 transition-colors hover:border-orange-400"
        >
          都不太想吃，换一批 →
        </button>
      </div>

      <div className="space-y-5">
        {isCook &&
          result.recipes.map((rec, i) => (
            <RecipeCard
              key={rec.candidate.id}
              rec={rec}
              rank={i}
              openingLine={i === 0 ? openingLine : null}
              onOpen={() => setOpenRecipe(rec)}
              onLog={onLog}
            />
          ))}

        {!isCook &&
          result.places.map((rec, i) => (
            <PlaceCard
              key={rec.candidate.id}
              rec={rec}
              rank={i}
              openingLine={i === 0 ? openingLine : null}
              onLog={onLog}
            />
          ))}
      </div>

      <RecipeDetailDialog recipe={openRecipe?.candidate ?? null} userIngredients={userIngredients} people={people} onClose={() => setOpenRecipe(null)} />
    </section>
  )
}

const RANK_LABEL = ['🥇 今日首选', '🥈 也不错', '🥉 备选']

function RecipeCard({
  rec,
  rank,
  openingLine,
  onOpen,
  onLog,
}: {
  rec: Recommendation<Recipe>
  rank: number
  openingLine: string | null
  onOpen: () => void
  onLog: (dishName: string, note: string) => void
}) {
  const r = rec.candidate
  const isTop = rank === 0

  return (
    <article
      onClick={onOpen}
      className={cn(
        'relative cursor-pointer p-5 transition-transform duration-300 hover:rotate-0 sm:p-6',
        isTop ? 'sticky-card-yellow rotate-[1.2deg]' : 'sticky-card rotate-[0.4deg]',
      )}
    >
      {isTop && <span className="washi-tape -top-3 left-1/2 -translate-x-1/2 rotate-[-2deg] bg-rose-300/70" />}

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold tracking-wide text-orange-800/70">{RANK_LABEL[rank]}</div>
          <h3 className={cn('font-display mt-1 text-orange-950', isTop ? 'text-3xl' : 'text-2xl')}>{r.name}</h3>
          {openingLine && (
            <p className="mt-2 text-sm leading-relaxed text-orange-900/80 sm:text-base">{openingLine}</p>
          )}
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rec.summary}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {r.cookMinutes} 分钟
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" /> {DIFFICULTY_LABEL[r.difficulty]}
            </span>
            {r.tags.map((t) => (
              <Badge key={t} variant="secondary" className="bg-orange-100/80 text-orange-800">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <ScoreSeal score={rec.totalScore} />
      </div>

      <WhyDetails breakdown={rec.breakdown} />
      <div className="mt-3 flex items-center justify-between">
        {isTop ? (
          <p className="text-xs text-muted-foreground">点开这张便签，看完整做法 →</p>
        ) : (
          <span />
        )}
        <LogButton
          onClick={() => onLog(r.name, `${r.cookMinutes} 分钟 · ${DIFFICULTY_LABEL[r.difficulty]}`)}
        />
      </div>
    </article>
  )
}

/** 「就它了，记一笔」小贴纸按钮 */
function LogButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="inline-flex rotate-1 items-center gap-1 rounded-lg border border-amber-600/30 bg-amber-200 px-2.5 py-1 text-xs font-semibold text-orange-950 shadow-sm transition-transform hover:rotate-0 hover:shadow"
    >
      就它了，记一笔 ✍️
    </button>
  )
}

/** 菜谱详情 Dialog：结果卡点开与「我想吃 X」搜索直弹共用。 */
export function RecipeDetailDialog({
  recipe,
  userIngredients,
  people,
  onClose,
}: {
  recipe: Recipe | null
  userIngredients: string[]
  people: number
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!recipe) return null
  const r = recipe
  const guides = getVideoGuides(r.videoKeyword)

  // 用量按人数缩放（基准 = recipe.servings，缺省 2 人份）
  const baseServings = r.servings ?? 2
  const factor = people / baseServings
  const scaled = (amount: string) => (factor === 1 ? amount : scaleAmount(amount, factor))

  // 缺料清单（只计非调料主食材）
  const missing = missingIngredients(r, userIngredients)
  const shoppingText = `采购清单：${missing
    .map((name) => `${name}×${scaled(r.ingredients.find((i) => i.name === name)?.amount ?? '适量')}`)
    .join('、')}`

  const handleCopy = () => {
    try {
      void navigator.clipboard
        ?.writeText(shoppingText)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {
          /* clipboard 不可用时静默降级 */
        })
    } catch {
      /* 静默降级 */
    }
  }

  return (
    <Dialog open={!!recipe} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-orange-900/10 bg-[#FBF5E9] sm:max-w-lg">
        <DialogHeader>
          <div className="relative inline-block">
            <span className="washi-tape -top-2 -left-6 w-14 rotate-[-12deg] bg-emerald-300/70" />
            <DialogTitle className="font-display text-3xl text-orange-950">{r.name}</DialogTitle>
          </div>
          <DialogDescription>{r.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <Clock className="mr-1 h-3.5 w-3.5" /> {r.cookMinutes} 分钟
          </Badge>
          <Badge variant="secondary" className="bg-amber-200/80 text-orange-900">
            <Flame className="mr-1 h-3.5 w-3.5" /> 难度：{DIFFICULTY_LABEL[r.difficulty]}
          </Badge>
        </div>

        <div>
          <h3 className="font-display mb-2 flex items-center gap-2 text-lg text-orange-950">
            🧂 食材用量
            {factor !== 1 && (
              <span className="inline-block rotate-[-2deg] rounded-lg border border-amber-600/30 bg-amber-200 px-2 py-0.5 text-xs font-semibold text-orange-950 shadow-sm">
                按 {people} 人份换算好了
              </span>
            )}
          </h3>
          <div className="overflow-hidden rounded-xl border border-orange-900/10">
            {r.ingredients.map((ing, i) => (
              <div
                key={ing.name}
                className={cn('flex justify-between px-4 py-2 text-sm', i % 2 === 0 ? 'bg-amber-100/70' : 'bg-white')}
              >
                <span className="font-medium text-orange-950">{ing.name}</span>
                <span className="text-muted-foreground">{scaled(ing.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 缺料采购清单 */}
        <div>
          <h3 className="font-display mb-2 text-lg text-orange-950">🛒 还差这些料</h3>
          {missing.length === 0 ? (
            <span className="inline-block rotate-[-1deg] rounded-lg border border-emerald-600/30 bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm">
              食材齐全，直接开火 🎉
            </span>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((name) => (
                  <span
                    key={name}
                    className="inline-flex -rotate-1 items-center rounded-lg border border-orange-900/15 bg-white px-3 py-1.5 text-sm text-orange-950 shadow-sm"
                  >
                    {name}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ×{scaled(r.ingredients.find((i) => i.name === name)?.amount ?? '适量')}
                    </span>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="font-display mt-2 border-b-2 border-dashed border-orange-400/0 pb-0.5 text-sm text-orange-800 transition-colors hover:border-orange-400"
              >
                {copied ? '已复制 ✓' : '复制清单'}
              </button>
            </>
          )}
        </div>

        <div>
          <h3 className="font-display mb-2 text-lg text-orange-950">👨‍🍳 分步做法</h3>
          <ol className="space-y-2.5">
            {r.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-800 text-xs font-bold text-amber-50">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-orange-950/90">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="font-display mb-2 text-lg text-orange-950">📺 视频指导</h3>
          <div className="grid grid-cols-2 gap-2">
            {guides.map((g) => (
              <a
                key={g.platform}
                href={g.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'flex items-center justify-center gap-2 rounded-2xl border border-black/5 px-3 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  g.platform === 'bilibili' ? 'bg-[#FB7299]' : 'bg-neutral-900',
                )}
              >
                {g.platform === 'bilibili' ? 'B站看做法' : '抖音看做法'}
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PlaceCard({
  rec,
  rank,
  openingLine,
  onLog,
}: {
  rec: Recommendation<PlaceCandidate>
  rank: number
  openingLine: string | null
  onLog: (dishName: string, note: string) => void
}) {
  const p = rec.candidate
  const source = SOURCE_META[p.source]
  const video = getVideoGuides(`${p.category} 探店`)[0]
  const isTop = rank === 0

  return (
    <article
      className={cn(
        'relative p-5 transition-transform duration-300 hover:rotate-0 sm:p-6',
        isTop ? 'sticky-card-yellow rotate-[-1.2deg]' : 'sticky-card rotate-[0.4deg]',
      )}
    >
      {isTop && <span className="washi-tape -top-3 left-1/2 -translate-x-1/2 rotate-[2deg] bg-sky-300/70" />}

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold tracking-wide text-orange-800/70">{RANK_LABEL[rank]}</div>
          <h3 className={cn('font-display mt-1 text-orange-950', isTop ? 'text-3xl' : 'text-2xl')}>{p.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{p.category}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> 人均 ¥{p.perCapita}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {p.distanceKm}km
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn('rounded-lg shadow-sm', source.className)}>
              {source.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{p.reason}</span>
          </div>
          {openingLine && <p className="mt-2 text-sm leading-relaxed text-orange-900/80 sm:text-base">{openingLine}</p>}
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{rec.summary}</p>
        </div>
        <ScoreSeal score={rec.totalScore} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={buildAmapUri(p.name)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-black/5 bg-orange-800 px-3 py-2.5 text-sm font-bold text-amber-50 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <MapPin className="h-4 w-4" /> 高德地图搜一下
        </a>
        {video && (
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-black/5 bg-[#FB7299] px-3 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            ▶ 视频看看
          </a>
        )}
      </div>

      <WhyDetails breakdown={rec.breakdown} />
      <div className="mt-3 flex justify-end">
        <LogButton onClick={() => onLog(p.name, `${p.category} · 人均 ¥${p.perCapita} · ${p.distanceKm}km`)} />
      </div>
    </article>
  )
}

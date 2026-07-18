import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { INGREDIENT_GROUPS } from '../core/data/ingredients'
import { parseMoodText } from '../core/engine/moodParse'
import type { CookMode, Mood } from '../core/types'
import { MODE_OPTIONS, MOOD_OPTIONS } from './labels'
import { cn } from '@/lib/utils'

interface InputPanelProps {
  mode: CookMode
  onModeChange: (m: CookMode) => void
  mood: Mood
  onMoodChange: (m: Mood) => void
  ingredients: string[]
  onToggleIngredient: (name: string) => void
  onClearIngredients: () => void
  /** 用户自己加的食材（持久化在 App 层） */
  customIngredients: string[]
  onAddCustomIngredient: (name: string) => void
  onRemoveCustomIngredient: (name: string) => void
  availableMinutes: number
  onMinutesChange: (v: number) => void
  /** 口味偏好 0~100，÷100 即 core 的 tasteBias */
  tastePercent: number
  onTastePercentChange: (v: number) => void
  /** 忌口食材（硬过滤） */
  dislikes: string[]
  onAddDislike: (name: string) => void
  onRemoveDislike: (name: string) => void
  /** 吃饭人数：1 / 2 / 4 */
  people: number
  onPeopleChange: (n: number) => void
}

const VISIBLE_GROUPS = 3
const STAMP_TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-1']
const NOTE_TILTS = ['-rotate-1', 'rotate-1', '-rotate-2']

export default function InputPanel({
  mode,
  onModeChange,
  mood,
  onMoodChange,
  ingredients,
  onToggleIngredient,
  onClearIngredients,
  customIngredients,
  onAddCustomIngredient,
  onRemoveCustomIngredient,
  availableMinutes,
  onMinutesChange,
  tastePercent,
  onTastePercentChange,
  dislikes,
  onAddDislike,
  onRemoveDislike,
  people,
  onPeopleChange,
}: InputPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [dislikeInput, setDislikeInput] = useState('')
  const [moodText, setMoodText] = useState('')
  const [moodHint, setMoodHint] = useState<{ mood: Mood; keyword: string } | null>(null)

  const groups = expanded ? INGREDIENT_GROUPS : INGREDIENT_GROUPS.slice(0, VISIBLE_GROUPS)

  const addDislike = (name: string) => {
    const n = name.trim()
    if (!n) return
    if (!dislikes.includes(n)) onAddDislike(n)
    setDislikeInput('')
  }

  const addCustomIngredient = () => {
    const name = customInput.trim()
    if (!name) return
    const known =
      customIngredients.includes(name) ||
      INGREDIENT_GROUPS.some((g) => g.items.includes(name))
    // 已在预设组里的直接勾选；全新的名字交给 App 层登记（会持久化）
    if (known) {
      if (!ingredients.includes(name)) onToggleIngredient(name)
    } else {
      onAddCustomIngredient(name)
    }
    setCustomInput('')
  }

  const removeCustomIngredient = (name: string) => {
    onRemoveCustomIngredient(name)
  }

  const handleMoodText = (text: string) => {
    setMoodText(text)
    if (!text.trim()) {
      setMoodHint(null)
      return
    }
    const result = parseMoodText(text)
    if (result.matchedKeyword) {
      setMoodHint({ mood: result.mood, keyword: result.matchedKeyword })
      onMoodChange(result.mood)
    } else {
      setMoodHint(null)
    }
  }

  const hintMeta = moodHint ? MOOD_OPTIONS.find((m) => m.value === moodHint.mood) : null

  return (
    <section className="mx-auto w-full max-w-3xl px-4">
      <div className="sticky-card relative p-6 sm:p-8">
        <span className="washi-tape -top-3 left-8 rotate-[-5deg] bg-amber-300/80" />
        <h2 className="font-display mb-6 text-2xl text-orange-950">先告诉我你的情况 📝</h2>

        <div className="space-y-8">
          {/* 模式三选一：三张小便签 */}
          <div>
            <div className="mb-3 text-sm font-semibold text-muted-foreground">今天想怎么解决？</div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {MODE_OPTIONS.map((opt, i) => {
                const active = mode === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onModeChange(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border border-orange-900/10 px-2 py-4 transition-all duration-200',
                      NOTE_TILTS[i % NOTE_TILTS.length],
                      active
                        ? 'scale-[1.06] rotate-0 bg-amber-100 shadow-lg shadow-orange-900/15'
                        : 'bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md',
                    )}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-base font-bold text-orange-950">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t-2 border-dashed border-orange-200/80" />

          {/* 心情印章 + 一句话解析 */}
          <div>
            <div className="mb-3 text-sm font-semibold text-muted-foreground">现在心情怎么样？</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
              {MOOD_OPTIONS.map((opt, i) => {
                const active = mood === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onMoodChange(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-full border-2 border-dashed px-2 py-3 transition-all duration-200',
                      STAMP_TILTS[i % STAMP_TILTS.length],
                      active
                        ? 'scale-110 rotate-0 border-orange-800/50 bg-orange-800 text-amber-50 shadow-md'
                        : 'border-orange-300/60 bg-white text-orange-950 hover:border-orange-500/60 hover:bg-orange-50',
                    )}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className={cn('text-sm font-medium', active && 'font-bold')}>{opt.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="relative mt-4">
              <input
                value={moodText}
                onChange={(e) => handleMoodText(e.target.value)}
                placeholder="一句话说说现在的感觉，比如：今天加班到九点，累瘫…"
                className="w-full rotate-[-0.3deg] rounded-xl border border-orange-900/10 bg-amber-100/60 px-4 py-2.5 text-sm text-orange-950 shadow-sm outline-none placeholder:text-muted-foreground/70 focus:border-orange-400"
              />
              {hintMeta && moodHint && (
                <div className="absolute -bottom-3 left-4 rotate-[-2deg] rounded-lg border border-amber-600/30 bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-orange-950 shadow-md">
                  我懂了：{hintMeta.label} {hintMeta.emoji}
                </div>
              )}
            </div>
          </div>

          <div className="border-t-2 border-dashed border-orange-200/80" />

          {/* 口味轻重 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-muted-foreground">口味今天想多重？</div>
              <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-orange-950 shadow-sm">
                {tastePercent < 35 ? '清淡一点' : tastePercent > 65 ? '重口一点' : '正常就好'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl" title="清淡">🥗</span>
              <Slider
                value={[tastePercent]}
                onValueChange={(v) => onTastePercentChange(v[0] ?? 50)}
                min={0}
                max={100}
                step={5}
                className="py-2"
              />
              <span className="text-xl" title="重口">🌶️</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>清爽少油</span>
              <span>麻辣咸香</span>
            </div>
          </div>

          {mode === 'cook' && (
            <>
              <div className="border-t-2 border-dashed border-orange-200/80" />

              {/* 冰箱贴食材区 */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-muted-foreground">
                    🧊 冰箱里有什么？
                    {ingredients.length > 0 && (
                      <span className="ml-2 rounded-full bg-orange-800 px-2 py-0.5 text-xs font-bold text-amber-50">
                        已选 {ingredients.length}
                      </span>
                    )}
                    {dislikes.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-[#D9500B]">
                        已避开 {dislikes.length} 样
                      </span>
                    )}
                  </div>
                  {ingredients.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClearIngredients()
                      }}
                      className="h-7 text-xs text-muted-foreground hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> 清空
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {groups.map((g) => (
                    <div key={g.group}>
                      <div className="font-display mb-1.5 text-sm text-orange-900/60">{g.group}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((item) => (
                          <IngredientSticker
                            key={item}
                            name={item}
                            active={ingredients.includes(item)}
                            onToggle={() => onToggleIngredient(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {customIngredients.length > 0 && (
                    <div>
                      <div className="font-display mb-1.5 text-sm text-orange-900/60">我自己加的</div>
                      <div className="flex flex-wrap gap-1.5">
                        {customIngredients.map((item) => (
                          <IngredientSticker
                            key={item}
                            name={item}
                            active={ingredients.includes(item)}
                            onToggle={() => onToggleIngredient(item)}
                            onRemove={() => removeCustomIngredient(item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 自定义食材输入 */}
                <div className="mt-4 flex gap-2">
                  <input
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomIngredient()
                      }
                    }}
                    placeholder="还有别的？写下来贴上去，比如：腊肠"
                    className="flex-1 rounded-xl border border-orange-900/15 bg-white px-4 py-2 text-sm text-orange-950 shadow-sm outline-none placeholder:text-muted-foreground/70 focus:border-orange-500"
                  />
                  <Button
                    type="button"
                    onClick={addCustomIngredient}
                    disabled={!customInput.trim()}
                    className="rounded-xl bg-orange-800 text-amber-50 shadow-[0_3px_0_0_rgba(96,50,20,0.55)] transition-all hover:bg-orange-900 active:translate-y-0.5 active:shadow-none"
                  >
                    <Plus className="h-4 w-4" /> 贴上去
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 text-orange-800 hover:bg-orange-50"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> 收起冰箱门
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" /> 打开整个冰箱（{INGREDIENT_GROUPS.length} 组）
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t-2 border-dashed border-orange-200/80" />

              {/* 忌口区 */}
              <div>
                <div className="mb-3 text-sm font-semibold text-muted-foreground">🚫 我不吃这些</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dislikes.map((name) => (
                    <span
                      key={name}
                      className="inline-flex -rotate-1 items-center gap-1 rounded-lg border-2 border-dashed border-[#D9500B]/50 bg-[#D9500B]/5 px-3 py-1.5 text-sm font-medium text-[#D9500B]"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => onRemoveDislike(name)}
                        aria-label={`删除忌口 ${name}`}
                        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[#D9500B] hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {['香菜', '葱', '海鲜'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => addDislike(quick)}
                      disabled={dislikes.includes(quick)}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-orange-900/20 bg-white px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#D9500B]/40 hover:text-[#D9500B] disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> {quick}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={dislikeInput}
                    onChange={(e) => setDislikeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addDislike(dislikeInput)
                      }
                    }}
                    placeholder="还有忌口？比如：香菜、榴莲"
                    className="flex-1 rounded-xl border border-orange-900/15 bg-white px-4 py-2 text-sm text-orange-950 shadow-sm outline-none placeholder:text-muted-foreground/70 focus:border-[#D9500B]/50"
                  />
                  <Button
                    type="button"
                    onClick={() => addDislike(dislikeInput)}
                    disabled={!dislikeInput.trim()}
                    variant="outline"
                    className="rounded-xl border-[#D9500B]/40 text-[#D9500B] hover:bg-[#D9500B]/5"
                  >
                    <Plus className="h-4 w-4" /> 记上
                  </Button>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-orange-200/80" />

              {/* 人数 */}
              <div>
                <div className="mb-3 text-sm font-semibold text-muted-foreground">🍚 几个人吃？</div>
                <div className="flex gap-2">
                  {[
                    { n: 1, label: '1 人' },
                    { n: 2, label: '2 人' },
                    { n: 4, label: '3-4 人' },
                  ].map((opt, i) => {
                    const active = people === opt.n
                    return (
                      <button
                        key={opt.n}
                        type="button"
                        onClick={() => onPeopleChange(opt.n)}
                        className={cn(
                          'rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150',
                          NOTE_TILTS[i % NOTE_TILTS.length],
                          active
                            ? 'scale-105 rotate-0 border-orange-800/40 bg-orange-800 text-amber-50 shadow-md'
                            : 'border-orange-900/10 bg-white text-orange-950 shadow-sm hover:-translate-y-0.5',
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">菜谱里的用量会按人数帮你换算好</p>
              </div>

              <div className="border-t-2 border-dashed border-orange-200/80" />

              {/* 可用时间 */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-muted-foreground">⏳ 我大概有这么久：</div>
                  <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-orange-950 shadow-sm">
                    {availableMinutes} 分钟
                  </span>
                </div>
                <Slider
                  value={[availableMinutes]}
                  onValueChange={(v) => onMinutesChange(v[0] ?? 45)}
                  min={10}
                  max={120}
                  step={5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10 分钟·随便扒两口</span>
                  <span>120 分钟·可以慢慢炖</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function IngredientSticker({
  name,
  active,
  onToggle,
  onRemove,
}: {
  name: string
  active: boolean
  onToggle: () => void
  onRemove?: () => void
}) {
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition-all duration-150',
          active
            ? '-rotate-1 border-amber-600/30 bg-amber-200 font-semibold text-orange-950 shadow-md'
            : 'border-orange-900/10 bg-white text-orange-950 shadow-sm hover:-translate-y-0.5 hover:shadow',
          onRemove && 'pr-6',
        )}
      >
        {active && <Check className="h-3 w-3 text-orange-800" />}
        {name}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`删除 ${name}`}
          className="absolute top-1/2 right-1 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-orange-900/50 hover:bg-orange-800 hover:text-amber-50"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

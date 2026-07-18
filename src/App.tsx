import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Hero from './sections/Hero'
import InputPanel from './sections/InputPanel'
import QuickSearch from './sections/QuickSearch'
import CuisineWheel from './sections/CuisineWheel'
import Results, { RecipeDetailDialog } from './sections/Results'
import RecordsSection, { type RecordDraft } from './sections/RecordsSection'
import Footer from './sections/Footer'
import { useWeather } from './hooks/useWeather'
import { recommend } from './core/engine/recommend'
import { matchRecipeIdsByDishName } from './core/services/recordStore'
import { RECIPES } from './core/data/recipes'
import { PLACES } from './core/data/places'
import { createLocalRecordRepo } from './lib/localRecordRepo'
import { addRecentEaten, loadRecentEaten } from './lib/recentEatenStore'
import { loadPrefs, savePrefs } from './lib/prefsStore'
import { CUISINES } from './lib/cuisines'
import { filterPlacesByCuisine } from './lib/filterByCuisine'
import type { CookMode, FoodRecord, Mood, Recipe, RecommendResult, ScorerContext } from './core/types'

export default function App() {
  const { weather, loading, isManual, refresh, setManual, resetToAuto } = useWeather()
  // 「记住你家冰箱」：5 项偏好初始化自 localStorage（心情/模式/时间不记，是当下的）
  const [initialPrefs] = useState(loadPrefs)
  const [mode, setMode] = useState<CookMode>('cook')
  const [mood, setMood] = useState<Mood>('relaxed')
  const [ingredients, setIngredients] = useState<string[]>(initialPrefs.selectedIngredients)
  const [customIngredients, setCustomIngredients] = useState<string[]>(initialPrefs.customIngredients)
  const [availableMinutes, setAvailableMinutes] = useState(45)
  const [tastePercent, setTastePercent] = useState(initialPrefs.tastePercent)
  const [dislikes, setDislikes] = useState<string[]>(initialPrefs.dislikes)
  const [people, setPeople] = useState(initialPrefs.people)
  // 「换一批」兜底：新 Top1 与上一批相同说明引擎回退了
  const [repeatNote, setRepeatNote] = useState(false)

  // 任一偏好变化即合并写回（量很小，直接写）
  useEffect(() => {
    savePrefs({
      selectedIngredients: ingredients,
      customIngredients,
      dislikes,
      tastePercent,
      people,
    })
  }, [ingredients, customIngredients, dislikes, tastePercent, people])

  const recordRepo = useMemo(() => createLocalRecordRepo(), [])
  // 初始 recentEaten = 持久化的最近吃过 ∪ 记录墙匹配出的菜谱
  const [recentEaten, setRecentEaten] = useState<string[]>(() => {
    const persisted = loadRecentEaten()
    const fromRecords = matchRecipeIdsByDishName(recordRepo.list(), RECIPES)
    return [...new Set([...persisted, ...fromRecords])]
  })
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [recordDraft, setRecordDraft] = useState<RecordDraft | null>(null)
  // 「我想吃 X」搜索直弹的菜谱详情
  const [quickRecipe, setQuickRecipe] = useState<Recipe | null>(null)
  // 菜系转盘（仅 dineout）：选中后对推荐结果做菜系过滤
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 选了菜系必须先全量排序再过滤（在 Top3 上过滤会误判「未收录」，见 filterByCuisine 头注释）
  const cuisineTopN = (cuisine: string | null) =>
    mode === 'dineout' && cuisine ? PLACES.length : undefined

  // 菜系过滤：recommend 全量排序结果 → filterPlacesByCuisine 裁剪
  const { displayedResult, cuisineNote } = useMemo(() => {
    if (!result || result.mode !== 'dineout' || !selectedCuisine) {
      return { displayedResult: result, cuisineNote: null as 'filtered' | 'fallback' | null }
    }
    const { list, note } = filterPlacesByCuisine(result.places, selectedCuisine)
    return { displayedResult: { ...result, places: list }, cuisineNote: note }
  }, [result, selectedCuisine])

  const handleModeChange = (m: CookMode) => {
    setMode(m)
    setSelectedCuisine(null) // 换模式清掉菜系选择
  }

  const buildCtx = (eaten: string[]): ScorerContext => ({
    ingredients,
    weather: weather as NonNullable<typeof weather>,
    now: new Date(),
    mood,
    availableMinutes,
    recentEaten: eaten,
    tasteBias: tastePercent / 100,
    dislikes,
  })

  const scrollToResults = () => {
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleDecide = () => {
    if (!weather) return
    setRepeatNote(false)
    setResult(recommend(mode, buildCtx(recentEaten), cuisineTopN(selectedCuisine)))
    scrollToResults()
  }

  // 先决定后转菜系：已有 dineout 结果时用对应 topN 重跑，过滤立即生效
  useEffect(() => {
    if (!weather || mode !== 'dineout' || !result || result.mode !== 'dineout') return
    setResult(recommend('dineout', buildCtx(recentEaten), cuisineTopN(selectedCuisine)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCuisine])

  const topIdOf = (r: RecommendResult): string | null =>
    r.mode === 'cook' ? (r.recipes[0]?.candidate.id ?? null) : (r.places[0]?.candidate.id ?? null)

  const handleShuffle = () => {
    if (!weather || !result) return
    const prevTopId = displayedResult ? topIdOf(displayedResult) : topIdOf(result)
    // 标记「本批已展示」的（菜系过滤后的那批），而不是原始全量
    const ids =
      (displayedResult ?? result).mode === 'cook'
        ? (displayedResult ?? result).recipes.map((r) => r.candidate.id)
        : (displayedResult ?? result).places.map((p) => p.candidate.id)
    addRecentEaten(ids) // 持久化（7 天有效）
    const eaten = [...new Set([...recentEaten, ...ids])]
    setRecentEaten(eaten)
    const next = recommend(mode, buildCtx(eaten), cuisineTopN(selectedCuisine))
    // 候选不足引擎回退：新 Top1 与上一批相同 → 提示
    setRepeatNote(topIdOf(next) === prevTopId)
    setResult(next)
  }

  const handleRecordAdded = (record: FoodRecord) => {
    const ids = matchRecipeIdsByDishName([record], RECIPES)
    if (ids.length > 0) {
      addRecentEaten(ids)
      setRecentEaten((prev) => [...new Set([...prev, ...ids])])
    }
    setRecordDraft(null)
  }

  // 结果卡「就它了，记一笔」→ 生成预填草稿，RecordsSection 自动开 Dialog
  const handleLogFromResult = (dishName: string, note: string) => {
    setRecordDraft({ dishName, note, mood, mode })
  }

  const toggleIngredient = (name: string) => {
    setIngredients((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]))
  }

  const addCustomIngredient = (name: string) => {
    setCustomIngredients((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setIngredients((prev) => (prev.includes(name) ? prev : [...prev, name]))
  }

  const removeCustomIngredient = (name: string) => {
    setCustomIngredients((prev) => prev.filter((i) => i !== name))
    setIngredients((prev) => prev.filter((i) => i !== name))
  }

  return (
    <div className="min-h-screen">
      <Hero
        weather={weather}
        loading={loading}
        isManual={isManual}
        onRefresh={refresh}
        onSetManual={setManual}
        onResetAuto={resetToAuto}
      />

      <InputPanel
        mode={mode}
        onModeChange={handleModeChange}
        mood={mood}
        onMoodChange={setMood}
        ingredients={ingredients}
        onToggleIngredient={toggleIngredient}
        onClearIngredients={() => setIngredients([])}
        customIngredients={customIngredients}
        onAddCustomIngredient={addCustomIngredient}
        onRemoveCustomIngredient={removeCustomIngredient}
        availableMinutes={availableMinutes}
        onMinutesChange={setAvailableMinutes}
        tastePercent={tastePercent}
        onTastePercentChange={setTastePercent}
        dislikes={dislikes}
        onAddDislike={(name) => setDislikes((prev) => (prev.includes(name) ? prev : [...prev, name]))}
        onRemoveDislike={(name) => setDislikes((prev) => prev.filter((d) => d !== name))}
        people={people}
        onPeopleChange={setPeople}
      />

      {/* 「我想吃 X」直接搜索（CTA 上方） */}
      <QuickSearch onOpenRecipe={setQuickRecipe} />
      <RecipeDetailDialog
        recipe={quickRecipe}
        userIngredients={ingredients}
        people={people}
        onClose={() => setQuickRecipe(null)}
      />

      {/* 菜系转盘：仅外出吃模式 */}
      {mode === 'dineout' && <CuisineWheel selected={selectedCuisine} onSelect={setSelectedCuisine} />}

      <div className="mx-auto w-full max-w-3xl px-4 pt-8 text-center">
        <Button
          size="lg"
          onClick={handleDecide}
          disabled={!weather}
          className="font-display h-14 w-full rounded-2xl bg-orange-800 text-xl tracking-wider text-amber-50 shadow-[0_5px_0_0_rgba(96,50,20,0.55)] transition-all hover:bg-orange-900 active:translate-y-1 active:shadow-[0_1px_0_0_rgba(96,50,20,0.55)] sm:w-auto sm:px-14"
        >
          <Sparkles className="h-5 w-5" />
          {weather ? '帮我决定！' : '天气加载中…'}
        </Button>
      </div>

      <div ref={resultsRef} className="scroll-mt-4">
        {repeatNote && result && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-6">
            <div className="sticky-card-yellow inline-block rotate-[-1deg] px-4 py-2 text-sm font-semibold text-orange-950">
              菜谱翻遍啦，这几道还是最合适你的 😄
            </div>
          </div>
        )}
        {cuisineNote && selectedCuisine && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-6">
            <div className="sticky-card-yellow inline-block rotate-[1deg] px-4 py-2 text-sm font-semibold text-orange-950">
              {cuisineNote === 'filtered'
                ? `${CUISINES.find((c) => c.name === selectedCuisine)?.emoji ?? '🎡'} ${selectedCuisine} · 转盘为你选的`
                : `附近还没收录${selectedCuisine}，先看看这些`}
            </div>
          </div>
        )}
        <Results
          result={displayedResult}
          weather={weather}
          mood={mood}
          onShuffle={handleShuffle}
          onLog={handleLogFromResult}
          userIngredients={ingredients}
          people={people}
        />
      </div>

      <RecordsSection repo={recordRepo} onRecordAdded={handleRecordAdded} draft={recordDraft} onDraftDone={() => setRecordDraft(null)} />

      <Footer />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { MapPin, Search, Store, UtensilsCrossed, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RECIPES } from '../core/data/recipes'
import { PLACES } from '../core/data/places'
import { groupSearchHits, searchDishes, type DishSearchHit } from '../lib/dishSearch'
import { buildAmapUri } from '../core/services/amap'
import { getVideoGuides } from '../core/services/video'
import type { PlaceCandidate, Recipe } from '../core/types'
import { SOURCE_META } from './labels'
import { cn } from '@/lib/utils'

interface QuickSearchProps {
  /** 点中菜谱建议：由上层弹出菜谱详情 Dialog（复用 Results 的 RecipeDetailDialog） */
  onOpenRecipe: (recipe: Recipe) => void
}

const HIT_TILTS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[1.5deg]', '-rotate-2']

/** 「我想吃 X」直接搜索：小贴纸建议分「🍳 菜谱」「🏪 商户」两组，菜谱直弹详情，商户弹推荐卡。 */
export default function QuickSearch({ onOpenRecipe }: QuickSearchProps) {
  const [query, setQuery] = useState('')
  const [openPlace, setOpenPlace] = useState<PlaceCandidate | null>(null)

  const trimmed = query.trim()
  const hits = useMemo(() => searchDishes(trimmed, RECIPES, PLACES), [trimmed])
  const groups = useMemo(() => groupSearchHits(hits), [hits])

  const pick = (id: string, kind: 'recipe' | 'place') => {
    if (kind === 'recipe') {
      const recipe = RECIPES.find((r) => r.id === id)
      if (recipe) {
        onOpenRecipe(recipe)
        setQuery('')
      }
    } else {
      const place = PLACES.find((p) => p.id === id)
      if (place) setOpenPlace(place)
    }
  }

  const renderSticker = (h: DishSearchHit, i: number) => (
    <button
      key={`${h.kind}-${h.id}`}
      type="button"
      onClick={() => pick(h.id, h.kind)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md',
        HIT_TILTS[i % HIT_TILTS.length],
        h.kind === 'recipe'
          ? 'border-amber-600/30 bg-amber-200 font-semibold text-orange-950'
          : 'border-sky-600/20 bg-sky-100 font-semibold text-sky-950',
      )}
    >
      {h.kind === 'recipe' ? (
        <UtensilsCrossed className="h-3.5 w-3.5" />
      ) : (
        <Store className="h-3.5 w-3.5" />
      )}
      {h.title}
      <span className="text-xs font-normal opacity-70">{h.subtitle}</span>
    </button>
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6">
      <div className="relative">
        <div className="flex rotate-[-0.4deg] items-center gap-2 rounded-2xl border border-orange-900/10 bg-white/80 px-4 py-2.5 shadow-sm transition-shadow focus-within:shadow-md">
          <Search className="h-4 w-4 shrink-0 text-orange-800/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="心里已经有答案了？直接搜 →"
            className="w-full bg-transparent text-sm text-orange-950 outline-none placeholder:text-muted-foreground/80"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
              className="shrink-0 text-muted-foreground hover:text-orange-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {trimmed && (
          <div className="absolute inset-x-0 top-full z-20 mt-2">
            {hits.length > 0 ? (
              <div className="sticky-card flex flex-col gap-2.5 p-3">
                {groups.recipes.length > 0 && (
                  <section>
                    <div className="mb-1.5 -rotate-1 text-xs font-bold tracking-wide text-orange-900/60">
                      🍳 菜谱 · 自己做
                    </div>
                    <div className="flex flex-wrap gap-2">{groups.recipes.map(renderSticker)}</div>
                  </section>
                )}
                {groups.places.length > 0 && (
                  <section>
                    <div className="mb-1.5 rotate-[0.5deg] text-xs font-bold tracking-wide text-sky-900/60">
                      🏪 商户 · 附近有店在做
                    </div>
                    <div className="flex flex-wrap gap-2">{groups.places.map(renderSticker)}</div>
                  </section>
                )}
              </div>
            ) : (
              <div className="sticky-card-yellow inline-block rotate-[-1deg] px-4 py-2 text-sm font-semibold text-orange-950 shadow-md">
                手账里还没有这道，点下面的「帮我决定」试试推荐 😅
              </div>
            )}
          </div>
        )}
      </div>

      <PlaceQuickDialog place={openPlace} onClose={() => setOpenPlace(null)} />
    </div>
  )
}

/** 商户推荐卡样式小弹窗：高德 / 视频按钮直达。 */
function PlaceQuickDialog({ place, onClose }: { place: PlaceCandidate | null; onClose: () => void }) {
  if (!place) return null
  const source = SOURCE_META[place.source]
  const video = getVideoGuides(`${place.category} 探店`)[0]

  return (
    <Dialog open={!!place} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl border-orange-900/10 bg-[#FBF5E9] sm:max-w-md">
        <DialogHeader>
          <div className="relative inline-block">
            <span className="washi-tape -top-2 -left-6 w-14 rotate-[-12deg] bg-sky-300/70" />
            <DialogTitle className="font-display text-2xl text-orange-950">{place.name}</DialogTitle>
          </div>
          <DialogDescription>
            {place.category} · 人均 ¥{place.perCapita} · {place.distanceKm}km
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-lg border px-2 py-0.5 text-xs font-semibold shadow-sm', source.className)}>
            {source.label}
          </span>
          <span className="text-xs text-muted-foreground">{place.reason}</span>
        </div>

        {place.signatureDishes && place.signatureDishes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-orange-900/60">招牌：</span>
            {place.signatureDishes.map((d) => (
              <span
                key={d}
                className="rounded-lg border border-amber-600/25 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-orange-950 shadow-sm"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a
            href={buildAmapUri(place.name)}
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
      </DialogContent>
    </Dialog>
  )
}

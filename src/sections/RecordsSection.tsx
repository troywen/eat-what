import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImagePlus, NotebookPen, Pencil, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RecordRepository } from '../core/services/recordStore'
import type { CookMode, FoodRecord, Mood } from '../core/types'
import { fileToPhotoDataUrl } from '../lib/imageCompress'
import { computeWeeklyStats } from '../lib/weeklyStats'
import { MOOD_OPTIONS } from './labels'
import { cn } from '@/lib/utils'

/** 「就它了，记一笔」预填草稿 */
export interface RecordDraft {
  dishName: string
  note?: string
  mood?: Mood
  mode?: CookMode
}

interface RecordsSectionProps {
  repo: RecordRepository
  onRecordAdded: (record: FoodRecord) => void
  /** 外部传入草稿时自动打开 Dialog 并预填 */
  draft: RecordDraft | null
  onDraftDone: () => void
}

const TILTS = ['-rotate-[1.5deg]', 'rotate-[1.5deg]', '-rotate-1', 'rotate-1']
const TAPE_COLORS = ['bg-rose-300/70', 'bg-sky-300/70', 'bg-emerald-300/70', 'bg-amber-300/80']

function formatDay(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}月${d.getDate()}日`
}

function newId(): string {
  return `fr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export default function RecordsSection({ repo, onRecordAdded, draft, onDraftDone }: RecordsSectionProps) {
  const [records, setRecords] = useState<FoodRecord[]>(() => repo.list())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodRecord | null>(null)
  const [shareHintId, setShareHintId] = useState<string | null>(null)
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 收到外部草稿（来自结果卡「就它了，记一笔」）→ 打开 Dialog 预填
  useEffect(() => {
    if (draft) {
      setEditing(null)
      setDialogOpen(true)
    }
  }, [draft])

  const showShareHint = (id: string) => {
    setShareHintId(id)
    if (shareTimer.current) clearTimeout(shareTimer.current)
    shareTimer.current = setTimeout(() => setShareHintId(null), 3000)
  }

  const handleRemove = (id: string) => {
    if (!window.confirm('把这页从手账里撕掉？')) return
    repo.remove(id)
    setRecords(repo.list())
  }

  const handleEdit = (record: FoodRecord) => {
    setEditing(record)
    setDialogOpen(true)
  }

  const handleSaved = (record: FoodRecord, isEdit: boolean) => {
    if (isEdit) {
      repo.update(record)
    } else {
      repo.add(record)
      onRecordAdded(record)
    }
    setRecords(repo.list())
    setDialogOpen(false)
    setEditing(null)
    onDraftDone()
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditing(null)
    onDraftDone()
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pt-12">
      <div className="mb-1 flex items-end justify-between">
        <h2 className="font-display text-3xl text-orange-950">我的手账记录 📷</h2>
        <Button
          onClick={() => setDialogOpen(true)}
          className="font-display rounded-2xl bg-orange-800 tracking-wider text-amber-50 shadow-[0_4px_0_0_rgba(96,50,20,0.55)] transition-all hover:bg-orange-900 active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(96,50,20,0.55)]"
        >
          <NotebookPen className="h-4 w-4" /> 记一笔
        </Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">吃过了就记一笔，越记越懂你 ✍️</p>

      {records.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-orange-300/60 bg-white/50 px-6 py-10 text-center text-muted-foreground">
          还没有记录，吃顿好的来开第一页 📷
        </div>
      ) : (
        <>
          <WeeklySummaryCard records={records} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {records.map((r, i) => (
              <PolaroidCard
                key={r.id}
                record={r}
                tilt={TILTS[i % TILTS.length]}
                tape={TAPE_COLORS[i % TAPE_COLORS.length]}
                shareHint={shareHintId === r.id}
                onShare={() => showShareHint(r.id)}
                onEdit={() => handleEdit(r)}
                onRemove={() => handleRemove(r.id)}
              />
            ))}
          </div>
        </>
      )}

      <RecordDialog open={dialogOpen} initial={draft} editing={editing} onClose={handleDialogClose} onSaved={handleSaved} />
    </section>
  )
}

/** 「本周手账小结」便签黄大卡：最近 7 天的记录统计（total=0 不渲染）。 */
function WeeklySummaryCard({ records }: { records: FoodRecord[] }) {
  const stats = useMemo(() => computeWeeklyStats(records), [records])
  if (stats.total === 0) return null
  const moodMeta = stats.topMood ? MOOD_OPTIONS.find((m) => m.value === stats.topMood) : null

  return (
    <div className="sticky-card-yellow relative mb-6 rotate-[-0.8deg] p-5 transition-transform duration-300 hover:rotate-0">
      <span className="washi-tape -top-3 left-8 w-20 rotate-[-4deg] bg-sky-300/70" />
      <div className="font-display text-xl text-orange-950">本周手账小结 📖</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-orange-950/90">
        <span className="font-bold">本周吃了 {stats.total} 顿</span>
        <span>
          🍳×{stats.cookCount} 🛵×{stats.takeoutCount} 🥢×{stats.dineoutCount}
        </span>
        {moodMeta && (
          <span title={`最常心情：${moodMeta.label}`}>
            最常 {moodMeta.emoji} {moodMeta.label}
          </span>
        )}
        {stats.avgRating !== null && <span className="text-amber-600">★{stats.avgRating.toFixed(1)}</span>}
        {stats.streak > 0 && <span>🔥 连续 {stats.streak} 天</span>}
      </div>
      {stats.topDishes.length > 0 && (
        <div className="mt-1.5 text-xs text-orange-900/70">常客：{stats.topDishes.join('、')}</div>
      )}
    </div>
  )
}

function PolaroidCard({
  record,
  tilt,
  tape,
  shareHint,
  onShare,
  onEdit,
  onRemove,
}: {
  record: FoodRecord
  tilt: string
  tape: string
  shareHint: boolean
  onShare: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const mood = record.mood ? MOOD_OPTIONS.find((m) => m.value === record.mood) : undefined

  return (
    <article
      className={cn(
        'relative rounded-xl border border-orange-900/10 bg-white p-2 pb-3 shadow-md transition-transform duration-300 hover:rotate-0 hover:shadow-xl',
        tilt,
      )}
    >
      <span className={cn('washi-tape -top-2.5 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-2deg]', tape)} />
      <button
        type="button"
        onClick={onRemove}
        aria-label="删除这条记录"
        className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-red-600"
      >
        <X className="h-3 w-3" />
      </button>

      {record.photoDataUrl ? (
        <img
          src={record.photoDataUrl}
          alt={record.dishName}
          className="aspect-square w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-md bg-amber-100/70 text-4xl">
          🍽️
        </div>
      )}

      <div className="px-1 pt-2">
        <div className="flex items-center justify-between gap-1">
          <span className="font-display truncate text-base text-orange-950">{record.dishName}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatDay(record.createdAt)}</span>
        </div>
        {record.note && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{record.note}</p>}
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            {mood && <span title={mood.label}>{mood.emoji}</span>}
            {record.rating && <span className="text-amber-500">{'★'.repeat(record.rating)}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label="编辑这条记录"
              className="inline-flex -rotate-2 items-center gap-1 rounded-lg border border-sky-600/20 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-950 shadow-sm transition-transform hover:rotate-0 hover:shadow"
            >
              <Pencil className="h-3 w-3" /> 编辑
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1 rounded-lg border border-orange-900/10 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-orange-900 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Share2 className="h-3 w-3" /> 分享
            </button>
          </div>
        </div>
        {shareHint && (
          <p className="mt-1.5 rounded-lg bg-amber-100/80 px-2 py-1 text-[10px] leading-relaxed text-orange-900">
            分享和评论会在 App 上线后开放，先记给自己看吧 ✍️
          </p>
        )}
      </div>
    </article>
  )
}

function RecordDialog({
  open,
  initial,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  initial: RecordDraft | null
  /** 编辑已有记录时传入（优先于 initial 草稿） */
  editing: FoodRecord | null
  onClose: () => void
  onSaved: (record: FoodRecord, isEdit: boolean) => void
}) {
  const [dishName, setDishName] = useState('')
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [rating, setRating] = useState(0)
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  /** 编辑模式下的原照片（未换新照片时保留） */
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewUrl = useMemo(() => photo?.preview ?? existingPhoto ?? undefined, [photo, existingPhoto])

  // 打开时按编辑对象/草稿预填（都没有则清空）
  useEffect(() => {
    if (open) {
      setDishName(editing?.dishName ?? initial?.dishName ?? '')
      setNote(editing?.note ?? initial?.note ?? '')
      setMood(editing?.mood ?? initial?.mood ?? null)
      setRating(editing?.rating ?? 0)
      setPhoto(null)
      setExistingPhoto(editing?.photoDataUrl ?? null)
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const reset = () => {
    setDishName('')
    setNote('')
    setMood(null)
    setRating(0)
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto(null)
    setExistingPhoto(null)
    setSaving(false)
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  const handleSave = async () => {
    if (!dishName.trim() || saving) return
    setSaving(true)
    const photoDataUrl = photo ? await fileToPhotoDataUrl(photo.file) : (existingPhoto ?? undefined)
    if (editing) {
      // 编辑：保留 id/时间/评论/可见性，只更新可改字段
      onSaved(
        {
          ...editing,
          dishName: dishName.trim(),
          note: note.trim(),
          photoDataUrl,
          mood: mood ?? undefined,
          rating: rating > 0 ? (rating as 1 | 2 | 3 | 4 | 5) : undefined,
        },
        true,
      )
    } else {
      onSaved(
        {
          id: newId(),
          dishName: dishName.trim(),
          note: note.trim(),
          photoDataUrl,
          mood: mood ?? undefined,
          mode: initial?.mode,
          rating: rating > 0 ? (rating as 1 | 2 | 3 | 4 | 5) : undefined,
          visibility: 'private',
          comments: [],
          createdAt: new Date().toISOString(),
        },
        false,
      )
    }
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-orange-900/10 bg-[#FBF5E9] sm:max-w-md">
        <DialogHeader>
          <div className="relative inline-block">
            <span className="washi-tape -top-2 -left-6 w-14 rotate-[-12deg] bg-rose-300/70" />
            <DialogTitle className="font-display text-2xl text-orange-950">
              {editing ? '改一改这页 ✏️' : '记一笔 🍽️'}
            </DialogTitle>
          </div>
          <DialogDescription>{editing ? '菜名、备注、心情、星级、照片都能改。' : '拍张照、写两句，贴进手账里。'}</DialogDescription>
        </DialogHeader>

        {/* 照片 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="照片预览" className="max-h-48 w-full rounded-2xl object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (photo) URL.revokeObjectURL(photo.preview)
                  setPhoto(null)
                  setExistingPhoto(null)
                }}
                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600"
                aria-label="移除照片"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-orange-300/70 bg-white/60 px-4 py-6 text-muted-foreground transition-colors hover:border-orange-400 hover:bg-amber-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Camera className="h-5 w-5" /> 拍一张 / 从相册选一张
              </span>
              <span className="text-xs">（可选，不拍照也能记）</span>
            </button>
          )}
          {previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1 text-xs text-orange-800"
            >
              <ImagePlus className="h-3.5 w-3.5" /> 换一张
            </button>
          )}
        </div>

        {/* 菜名 */}
        <div>
          <input
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            placeholder="今天吃了什么？"
            className="w-full rounded-2xl border border-orange-900/15 bg-white px-4 py-2.5 text-base text-orange-950 shadow-sm outline-none placeholder:text-muted-foreground/70 focus:border-orange-500"
          />
        </div>

        {/* 备注 */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="随手写两句：味道、心情、和谁一起…"
          rows={3}
          className="w-full resize-none rounded-2xl border border-orange-900/15 bg-white px-4 py-2.5 text-sm text-orange-950 shadow-sm outline-none placeholder:text-muted-foreground/70 focus:border-orange-500"
        />

        {/* 心情 */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">当时的心情（可选）</div>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood((cur) => (cur === m.value ? null : m.value))}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all',
                  mood === m.value
                    ? 'border-orange-800/50 bg-orange-800 font-bold text-amber-50'
                    : 'border-orange-900/15 bg-white text-orange-950 hover:bg-orange-50',
                )}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 星级 */}
        <div>
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">打几颗星（可选）</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating((cur) => (cur === n ? 0 : n))}
                className={cn('text-2xl transition-transform hover:scale-110', n <= rating ? 'text-amber-500' : 'text-orange-900/20')}
                aria-label={`${n} 星`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => void handleSave()}
          disabled={!dishName.trim() || saving}
          className="font-display w-full rounded-2xl bg-orange-800 tracking-wider text-amber-50 shadow-[0_4px_0_0_rgba(96,50,20,0.55)] transition-all hover:bg-orange-900 active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(96,50,20,0.55)]"
        >
          {saving ? '贴上去中…' : editing ? '保存修改 📌' : '贴进手账 📌'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

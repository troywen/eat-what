export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-3xl px-4 pt-14 pb-10 text-center">
      <p className="font-display text-sm text-orange-900/60">—— 手账角落的小字 ——</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
        本页的天气、菜谱与商户均为模拟数据，用来演示推荐引擎；
        核心推荐层（食材/天气/时间/心情/时令/热度/新鲜度 7 维加权）与 UI 完全解耦，可整体迁移。
      </p>
      <p className="mt-2 text-xs text-orange-900/50">🍵 等一下吃什么 · 慢慢写，好好吃</p>
    </footer>
  )
}

/**
 * 原生 canvas 图片压缩：最长边 800px、JPEG 0.72 → dataURL。
 * 压缩失败或结果仍过大时返回 undefined（调用方降级为只存文字）。
 */

const MAX_EDGE = 800
const JPEG_QUALITY = 0.72
/** dataURL 体积上限（约 375KB 原图），防爆 localStorage */
const MAX_DATAURL_LENGTH = 500_000

export async function fileToPhotoDataUrl(file: File): Promise<string | undefined> {
  try {
    const dataUrl = await compressToDataUrl(file)
    if (dataUrl.length > MAX_DATAURL_LENGTH) {
      console.warn('[eat-what] 照片压缩后仍过大，仅保存文字')
      return undefined
    }
    return dataUrl
  } catch (e) {
    console.warn('[eat-what] 照片压缩失败，仅保存文字', e)
    return undefined
  }
}

async function compressToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建 canvas 2d 上下文')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}

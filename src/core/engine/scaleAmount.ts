/**
 * 份量缩放：把用量字符串中的阿拉伯数字（含小数）乘 factor 后格式化。
 * - 结果 >= 10：四舍五入取整
 * - 结果 < 10：保留到 0.5 步进（0.75→1、1.3→1.5、2.6→2.5）
 * - 非数字部分原样保留；无数字的串原样返回
 * 例：「3个（约150g）」×2 →「6个（约300g）」
 */

function formatScaled(value: number): string {
  if (value >= 10) {
    return String(Math.round(value));
  }
  const stepped = Math.round(value * 2) / 2;
  return stepped % 1 === 0 ? String(Math.trunc(stepped)) : stepped.toFixed(1);
}

export function scaleAmount(amount: string, factor: number): string {
  return amount.replace(/\d+(?:\.\d+)?/g, (m) => formatScaled(Number.parseFloat(m) * factor));
}

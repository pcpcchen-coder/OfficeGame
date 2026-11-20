// 每日題目以台灣時間（Asia/Taipei）午夜換日。

/** 第 0 天 = 2026-11-01（台灣時間） */
const EPOCH_UTC = Date.UTC(2026, 10, 1);
const DAY_MS = 86_400_000;

const taipeiFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 回傳台灣時間的 YYYY-MM-DD */
export function taipeiDateString(now: Date): string {
  return taipeiFormatter.format(now);
}

/** 從 2026-11-01 起算的天數（台灣時間） */
export function taipeiDayIndex(now: Date): number {
  const [y, m, d] = taipeiDateString(now).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / DAY_MS);
}

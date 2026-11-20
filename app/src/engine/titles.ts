// 左側欄的對話標題全部是無害的工作標題。

export const WORK_TITLES = [
  'Q3 預算檢討',
  'API 錯誤排查',
  '週報草稿',
  '會議紀錄整理',
  '客戶需求彙整',
  'SQL 查詢優化',
  '簡報大綱',
  '專案時程調整',
  '供應商比價',
  '年度計畫摘要',
  '使用者回饋分類',
  '報價單格式',
  'KPI 指標定義',
  '新人訓練清單',
  '系統上線檢查表',
  '合約條款摘要',
];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 依 id 挑一個標題，盡量不和現有的重複 */
export function pickTitle(id: string, taken: string[]): string {
  const start = hashString(id) % WORK_TITLES.length;
  for (let i = 0; i < WORK_TITLES.length; i++) {
    const t = WORK_TITLES[(start + i) % WORK_TITLES.length];
    if (!taken.includes(t)) return t;
  }
  return WORK_TITLES[start];
}

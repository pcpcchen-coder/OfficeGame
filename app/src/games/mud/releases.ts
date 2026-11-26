// 《B13 之龍》後續內容的開放設定。
// 每個段落填上開放日（台灣時間 YYYY-MM-DD）；null 表示還沒開放。
// 日期一到自動開放，不需要重新部署。網址加上 ?preview 可以略過這個限制試玩。

import { taipeiDateString } from '../../engine/date';

export type ReleaseKey = 'ch3' | 'finale' | 'ngplus';

export const MUD_RELEASES: Record<ReleaseKey, string | null> = {
  /** 第三章《B13》：地下 B1~B12，三隻守關 Boss */
  ch3: '2026-12-12',
  /** 終章：B13 三階段龍戰與三種結局 */
  finale: '2026-12-24',
  /** 二周目：看完結局後轉職重來 */
  ngplus: '2026-12-24',
};

export const RELEASE_LABEL: Record<ReleaseKey, string> = {
  ch3: '第三章《B13》',
  finale: '終章',
  ngplus: '二周目',
};

export function isOpen(key: ReleaseKey, now: Date, preview = false, releases = MUD_RELEASES): boolean {
  if (preview) return true;
  const date = releases[key];
  return date !== null && taipeiDateString(now) >= date;
}

/** 給玩家看的開放時間說明 */
export function releaseNote(key: ReleaseKey, releases = MUD_RELEASES): string {
  const date = releases[key];
  return date ? `${RELEASE_LABEL[key]}將於 ${date.slice(5).replace('-', '/')} 開放` : `${RELEASE_LABEL[key]}即將開放`;
}

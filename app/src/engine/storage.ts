// 存檔：每個動作後立刻寫進瀏覽器本機。讀寫失敗（隱私模式等）時照常運作，只是不保存。

import type { ChatMessage, GameId, Profile } from './types';
import { emptyProfile } from './types';

export interface Conversation {
  id: string;
  gameId: GameId;
  seed: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  state: unknown;
  suggestions: string[];
}

export interface Settings {
  /** Mo 回覆時的「思考中」節奏 */
  animate: boolean;
  /** 視窗失去焦點時自動切到老闆鍵畫面 */
  autoHideOnBlur: boolean;
  /** 老闆鍵畫面；'auto' = 每天輪替 */
  bossChat: string;
}

export interface SaveData {
  version: 1;
  conversations: Conversation[];
  activeId: string | null;
  profile: Profile;
  settings: Settings;
}

const KEY = 'moyu:v1';

export function defaultSettings(): Settings {
  return { animate: true, autoHideOnBlur: false, bossChat: 'auto' };
}

export function emptySave(): SaveData {
  return { version: 1, conversations: [], activeId: null, profile: emptyProfile(), settings: defaultSettings() };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== 1) return emptySave();
    const base = emptySave();
    return {
      ...base,
      ...data,
      profile: { ...base.profile, ...data.profile, daily: { ...base.profile.daily, ...data.profile?.daily } },
      settings: { ...base.settings, ...data.settings },
    } as SaveData;
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 本機儲存不可用時照常遊玩
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

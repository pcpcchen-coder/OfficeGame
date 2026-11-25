import { taipeiDateString } from '../engine/date';
import type { ComingSoonId, GameId, MoyuGame } from '../engine/types';
import { dailyGame } from './daily/daily';
import { guardGame } from './guard/guard';
import { idleGame } from './idle/idle';
import { lifeGame } from './life/life';
import { mudGame } from './mud/mud';
import { rogueGame } from './rogue/rogue';
import { tutorialGame } from './tutorial';

export interface ComingSoon {
  id: ComingSoonId;
  modelName: string;
  description: string;
  available: false;
  releaseDate?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = MoyuGame<any>;

export const GAMES: Record<GameId, AnyGame> = {
  'mo-assistant': tutorialGame,
  'mo-mud': mudGame,
  'mo-daily': dailyGame,
  'mo-idle-turbo': idleGame,
  'mo-rogue-mini': rogueGame,
  'mo-life-sim': lifeGame,
  'mo-guard': guardGame,
};

/** 模型選單的順序：主線排第一，其他是小品（含即將推出的遊戲） */
export const MODEL_MENU: Array<AnyGame | ComingSoon> = [
  tutorialGame,
  mudGame,
  dailyGame,
  idleGame,
  rogueGame,
  lifeGame,
  guardGame,
];

/** 上線日已到（或開了預覽模式）才能玩 */
export function isReleased(game: { releaseDate?: string }, now: Date, preview = false): boolean {
  if (preview || !game.releaseDate) return true;
  return taipeiDateString(now) >= game.releaseDate;
}

/** 距離上線還有幾天（台灣時間） */
export function daysUntilRelease(game: { releaseDate?: string }, now: Date): number {
  if (!game.releaseDate) return 0;
  const [y, m, d] = game.releaseDate.split('-').map(Number);
  const [ty, tm, td] = taipeiDateString(now).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

export function getGame(id: GameId): AnyGame | undefined {
  return (GAMES as Record<string, AnyGame>)[id];
}

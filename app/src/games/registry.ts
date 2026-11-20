import type { GameId, MoyuGame } from '../engine/types';
import { dailyGame } from './daily/daily';
import { tutorialGame } from './tutorial';

export interface ComingSoon {
  id: GameId;
  modelName: string;
  description: string;
  available: false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = MoyuGame<any>;

export const GAMES: Record<'mo-assistant' | 'mo-daily', AnyGame> = {
  'mo-assistant': tutorialGame,
  'mo-daily': dailyGame,
};

/** 模型選單的順序（含即將推出的遊戲） */
export const MODEL_MENU: Array<AnyGame | ComingSoon> = [
  tutorialGame,
  dailyGame,
  { id: 'mo-idle-turbo', modelName: 'mo-idle-turbo', description: '算力農場 · 放置經營（即將推出）', available: false },
  { id: 'mo-rogue-mini', modelName: 'mo-rogue-mini', description: 'Bug 地城 · Roguelite（即將推出）', available: false },
];

export function getGame(id: GameId): AnyGame | undefined {
  return (GAMES as Record<string, AnyGame>)[id];
}

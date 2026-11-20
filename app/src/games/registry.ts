import type { ComingSoonId, GameId, MoyuGame } from '../engine/types';
import { dailyGame } from './daily/daily';
import { idleGame } from './idle/idle';
import { rogueGame } from './rogue/rogue';
import { tutorialGame } from './tutorial';

export interface ComingSoon {
  id: ComingSoonId;
  modelName: string;
  description: string;
  available: false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = MoyuGame<any>;

export const GAMES: Record<GameId, AnyGame> = {
  'mo-assistant': tutorialGame,
  'mo-daily': dailyGame,
  'mo-idle-turbo': idleGame,
  'mo-rogue-mini': rogueGame,
};

/** 模型選單的順序（含即將推出的遊戲） */
export const MODEL_MENU: Array<AnyGame | ComingSoon> = [
  tutorialGame,
  dailyGame,
  idleGame,
  rogueGame,
  { id: 'mo-life-sim', modelName: 'mo-life-sim', description: '建議回覆人生（即將推出）', available: false },
];

export function getGame(id: GameId): AnyGame | undefined {
  return (GAMES as Record<string, AnyGame>)[id];
}

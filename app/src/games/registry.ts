import type { ComingSoonId, GameId, MoyuGame } from '../engine/types';
import { dailyGame } from './daily/daily';
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
};

/** 模型選單的順序：主線排第一，其他是小品（含即將推出的遊戲） */
export const MODEL_MENU: Array<AnyGame | ComingSoon> = [
  tutorialGame,
  mudGame,
  dailyGame,
  idleGame,
  rogueGame,
  lifeGame,
  { id: 'mo-guard', modelName: 'mo-guard', description: '年終密碼 · 說服 AI 說出秘密（即將推出）', available: false },
];

export function getGame(id: GameId): AnyGame | undefined {
  return (GAMES as Record<string, AnyGame>)[id];
}

// 所有遊戲共用的型別：一則訊息 = 一回合。

export interface ListItem {
  text: string;
  /** 被塗黑的行（每日提示詞用） */
  redacted?: boolean;
  /** 這一回合剛解開的行 */
  fresh?: boolean;
}

export type Block =
  | { kind: 'text'; text: string; tone?: 'muted' | 'success' | 'warn' }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }
  | { kind: 'code'; lang?: string; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][]; /** 逐欄對齊；文字欄用 'left' */ align?: Array<'left' | 'right'> }
  | { kind: 'share'; text: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'mo';
  blocks: Block[];
}

/** Mo 的一則回覆（還沒有 id） */
export type Reply = Block[];

export type GameId = 'mo-assistant' | 'mo-mud' | 'mo-daily' | 'mo-idle-turbo' | 'mo-rogue-mini' | 'mo-life-sim' | 'mo-guard';

/** 模型選單上還沒開放的項目 */
export type ComingSoonId = never;

export type GameEvent = 'bosskey-released';

export type PlayerInput = { type: 'text'; text: string } | { type: 'event'; name: GameEvent };

export interface DailyStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  lastWinDay: number | null;
  lastPlayedDay: number | null;
  /** distribution[i] = 第 i+1 次猜中的次數 */
  distribution: number[];
}

export interface RogueStats {
  runs: number;
  wins: number;
  bestDepth: number;
  /** 最後一次完成「每日地城」的天數 */
  lastDailyDay: number | null;
}

export interface LifeStats {
  runs: number;
  bestDays: number;
  /** 解鎖過的結局 id */
  endings: string[];
}

export interface Profile {
  tutorialDone: boolean;
  daily: DailyStats;
  rogue: RogueStats;
  life: LifeStats;
}

export type Action = { type: 'open-game'; gameId: GameId } | { type: 'restart-tutorial' };

export interface StepContext {
  profile: Profile;
  now: Date;
}

export interface StepResult<S> {
  state: S;
  replies: Reply[];
  suggestions: string[];
  /** 有變更時才回傳 */
  profile?: Profile;
  action?: Action;
}

export interface MoyuGame<S> {
  id: GameId;
  /** 模型選單上顯示的名稱 */
  modelName: string;
  /** 下拉選單裡的說明 */
  description: string;
  available: boolean;
  /** 上線日（台灣時間 YYYY-MM-DD）；在這天之前模型選單顯示「即將推出」 */
  releaseDate?: string;
  /** 決定這局的種子；同一個種子會回到同一段對話（例如每日題目） */
  seedFor(ctx: StepContext): string;
  init(seed: string, ctx: StepContext): StepResult<S>;
  step(state: S, input: PlayerInput, ctx: StepContext): StepResult<S>;
  /** 格式檢查，回傳錯誤訊息或 null。不合格的輸入不會被送出或儲存。 */
  validate?(text: string, state: S): string | null;
}

export function emptyProfile(): Profile {
  return {
    tutorialDone: false,
    daily: {
      played: 0,
      wins: 0,
      streak: 0,
      maxStreak: 0,
      lastWinDay: null,
      lastPlayedDay: null,
      distribution: [0, 0, 0, 0, 0, 0],
    },
    rogue: { runs: 0, wins: 0, bestDepth: 0, lastDailyDay: null },
    life: { runs: 0, bestDays: 0, endings: [] },
  };
}

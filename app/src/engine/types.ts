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
  | { kind: 'share'; text: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'mo';
  blocks: Block[];
}

/** Mo 的一則回覆（還沒有 id） */
export type Reply = Block[];

export type GameId = 'mo-assistant' | 'mo-daily' | 'mo-idle-turbo' | 'mo-rogue-mini';

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

export interface Profile {
  tutorialDone: boolean;
  daily: DailyStats;
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
  };
}

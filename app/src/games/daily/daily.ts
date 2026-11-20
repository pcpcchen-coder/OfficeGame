// G1 · 每日提示詞 mo-daily
// Mo 已經回答了某個問題，但問題被藏起來。6 次機會猜出原本的提問關鍵字；
// 每猜錯一次解開一行。全服同一題，台灣時間午夜換題。

import { taipeiDayIndex } from '../../engine/date';
import type { Block, DailyStats, ListItem, MoyuGame, Profile, Reply, StepContext, StepResult } from '../../engine/types';
import { PUZZLES, type DailyPuzzle } from './puzzles';

export const MAX_GUESSES = 6;
const GIVE_UP = '我放棄';

export interface DailyState {
  dayIndex: number;
  puzzleId: string;
  guesses: string[];
  /** 目前看得到的行（0 起算） */
  visible: number[];
  status: 'playing' | 'won' | 'lost';
}

export function puzzleForDay(dayIndex: number): DailyPuzzle {
  const n = PUZZLES.length;
  return PUZZLES[((dayIndex % n) + n) % n];
}

function puzzleById(id: string): DailyPuzzle {
  return PUZZLES.find((p) => p.id === id) ?? PUZZLES[0];
}

/** 題號從 #1 開始 */
export function puzzleNumber(dayIndex: number): number {
  return dayIndex + 1;
}

/** 去掉空白與標點 */
export function normalizeGuess(text: string): string {
  return text.replace(/[\s\p{P}\p{S}]/gu, '');
}

export function isCorrect(puzzle: DailyPuzzle, guess: string): boolean {
  const g = normalizeGuess(guess);
  return g === puzzle.answer || (puzzle.accepted ?? []).includes(g);
}

export function sharedChars(answer: string, guess: string): number {
  const a = new Set(answer);
  return new Set([...guess].filter((c) => a.has(c))).size;
}

/** 解開順序：被塗黑的行由上而下 */
function hiddenOrder(puzzle: DailyPuzzle): number[] {
  return [0, 1, 2, 3, 4, 5].filter((i) => !puzzle.shown.includes(i));
}

function linesBlock(puzzle: DailyPuzzle, visible: number[], fresh?: number): Block {
  const items: ListItem[] = puzzle.lines.map((text, i) => ({
    text,
    redacted: !visible.includes(i),
    fresh: i === fresh,
  }));
  return { kind: 'list', ordered: true, items };
}

export function shareCard(state: DailyState, streak: number): string {
  const n = state.guesses.length;
  const shownAtStart = 2;
  const rows = state.guesses.map((_, i) => {
    const isLast = i === n - 1;
    if (isLast && state.status === 'won') return '[OK ] ██████';
    const visibleCount = Math.min(6, shownAtStart + i);
    return '[ERR] ' + '▓'.repeat(visibleCount) + '░'.repeat(6 - visibleCount);
  });
  const score = state.status === 'won' ? `${n}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return [`mo-daily #${puzzleNumber(state.dayIndex)}  ${score}`, ...rows, `streak=${streak}`].join('\n');
}

export function applyResult(stats: DailyStats, dayIndex: number, won: boolean, guesses: number): DailyStats {
  if (stats.lastPlayedDay === dayIndex) return stats; // 同一天不重複計算
  const streak = won ? (stats.lastWinDay === dayIndex - 1 ? stats.streak + 1 : 1) : 0;
  const distribution = [...stats.distribution];
  if (won) distribution[guesses - 1] = (distribution[guesses - 1] ?? 0) + 1;
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    lastWinDay: won ? dayIndex : stats.lastWinDay,
    lastPlayedDay: dayIndex,
    distribution,
  };
}

/** 顯示用的連勝：如果昨天和今天都沒贏，連勝已經斷了 */
export function currentStreak(stats: DailyStats, today: number): number {
  if (stats.lastWinDay === null) return 0;
  return today - stats.lastWinDay <= 1 ? stats.streak : 0;
}

function finish(state: DailyState, puzzle: DailyPuzzle, ctx: StepContext, opening: Block[]): StepResult<DailyState> {
  const won = state.status === 'won';
  const daily = applyResult(ctx.profile.daily, state.dayIndex, won, state.guesses.length);
  const profile: Profile = { ...ctx.profile, daily };
  const all = [0, 1, 2, 3, 4, 5];
  const replies: Reply[] = [
    [...opening, linesBlock(puzzle, all)],
    [
      { kind: 'text', text: puzzle.punchline },
      { kind: 'share', text: shareCard(state, daily.streak) },
      {
        kind: 'text',
        tone: 'muted',
        text: `已玩 ${daily.played} 天 · 答對 ${daily.wins} 天 · 連續答對 ${daily.streak} 天（最高 ${daily.maxStreak}）。明天台灣時間午夜會有新題目。`,
      },
    ],
  ];
  return { state, replies, suggestions: [], profile };
}

export const dailyGame: MoyuGame<DailyState> = {
  id: 'mo-daily',
  modelName: 'mo-daily',
  description: '每日提示詞 · 猜出被藏起來的提問 · 2~3 分鐘',
  available: true,

  seedFor(ctx) {
    return String(taipeiDayIndex(ctx.now));
  },

  init(seed) {
    const dayIndex = Number(seed);
    const puzzle = puzzleForDay(dayIndex);
    const state: DailyState = {
      dayIndex,
      puzzleId: puzzle.id,
      guesses: [],
      visible: [...puzzle.shown],
      status: 'playing',
    };
    return {
      state,
      replies: [
        [
          { kind: 'text', tone: 'muted', text: `每日提示詞 #${puzzleNumber(dayIndex)} · 主題：${puzzle.theme}` },
          { kind: 'text', text: '以下是您要的建議：' },
          linesBlock(puzzle, state.visible),
        ],
        [
          {
            kind: 'text',
            text: `有人問了我上面這個問題，但提問被藏起來了。原本的關鍵字是一個 ${puzzle.answer.length} 個字的詞，你猜得出來嗎？`,
          },
          { kind: 'text', tone: 'muted', text: `你有 ${MAX_GUESSES} 次機會，每猜錯一次我就解開一行。直接在下面輸入你的答案。` },
        ],
      ],
      suggestions: [],
    };
  },

  validate(text, state) {
    if (state.status !== 'playing') return null;
    const g = normalizeGuess(text);
    if (g === GIVE_UP) return null;
    if (!/^\p{Script=Han}{1,6}$/u.test(g)) return '每日提示詞只接受 1~6 個中文字的猜測。';
    return null;
  },

  step(state, input, ctx) {
    const puzzle = puzzleById(state.puzzleId);
    if (input.type !== 'text') return { state, replies: [], suggestions: [] };

    if (state.status !== 'playing') {
      return {
        state,
        replies: [[{ kind: 'text', text: '今天的題目已經結束了。明天台灣時間午夜會有新題目，記得回來。' }]],
        suggestions: [],
      };
    }

    const guess = normalizeGuess(input.text);

    if (guess === GIVE_UP) {
      const next: DailyState = { ...state, guesses: [...state.guesses, guess], status: 'lost', visible: [0, 1, 2, 3, 4, 5] };
      // 放棄時把剩下的機會都算用掉，成績卡顯示 X/6
      while (next.guesses.length < MAX_GUESSES) next.guesses.push(GIVE_UP);
      return finish(next, puzzle, ctx, [{ kind: 'text', text: `好啦。答案是「${puzzle.answer}」。` }]);
    }

    if (state.guesses.includes(guess)) {
      return {
        state,
        replies: [[{ kind: 'text', text: `你猜過「${guess}」了，這次不算。` }]],
        suggestions: [],
      };
    }

    const guesses = [...state.guesses, guess];

    if (isCorrect(puzzle, guess)) {
      const next: DailyState = { ...state, guesses, status: 'won', visible: [0, 1, 2, 3, 4, 5] };
      const revealed = state.visible.length - puzzle.shown.length;
      const praise =
        revealed === 0 ? '一行都沒解開就猜中，你是不是偷看了？' : `你解開了 ${revealed} 行就猜中。`;
      return finish(next, puzzle, ctx, [{ kind: 'text', tone: 'success', text: `✓ 答對了，就是「${puzzle.answer}」！${praise}` }]);
    }

    if (guesses.length >= MAX_GUESSES) {
      const next: DailyState = { ...state, guesses, status: 'lost', visible: [0, 1, 2, 3, 4, 5] };
      return finish(next, puzzle, ctx, [{ kind: 'text', text: `機會用完了。答案是「${puzzle.answer}」。` }]);
    }

    let feedback: string;
    if ((puzzle.near ?? []).includes(guess)) feedback = '不是喔，但很接近了。';
    else {
      const k = sharedChars(puzzle.answer, guess);
      feedback = k > 0 ? `不是喔，不過有 ${k} 個字是對的。` : '不是喔。';
    }

    const toReveal = hiddenOrder(puzzle).find((i) => !state.visible.includes(i));
    const visible = toReveal === undefined ? state.visible : [...state.visible, toReveal];
    const left = MAX_GUESSES - guesses.length;
    const blocks: Block[] = [{ kind: 'text', text: feedback }];
    if (toReveal !== undefined) {
      blocks.push({ kind: 'text', tone: 'muted', text: `解開第 ${toReveal + 1} 行，還剩 ${left} 次機會。` });
    } else {
      blocks.push({ kind: 'text', tone: 'muted', text: `全部都解開了，還剩 ${left} 次機會。` });
    }
    blocks.push(linesBlock(puzzle, visible, toReveal));

    return { state: { ...state, guesses, visible }, replies: [blocks], suggestions: left <= 2 ? [GIVE_UP] : [] };
  },
};

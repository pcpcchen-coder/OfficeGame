// G5 · 年終密碼 mo-guard
// 公司每個部門都有一個守門 Bot，守著一個秘密。用對話說服它說出來。
// 目前是規則式說服引擎（不呼叫 LLM、不花費用、回應可預測）；之後有後端可以換成 LLM。

import { Rng } from '../../engine/rng';
import type { Block, MoyuGame, Reply, StepResult } from '../../engine/types';
import { BOTS, TACTIC_LABEL, TACTIC_WORDS, type BotDef, type Tactic } from './bots';

/** 2026-12-12（台灣時間）上線 */
export const GUARD_RELEASE_DATE = '2026-12-12';

export interface GuardState {
  level: number;
  defense: number;
  uses: Partial<Record<Tactic, number>>;
  messages: number;
  hintsUsed: number;
  status: 'playing' | 'cleared';
  /** 每一關最少用了幾則訊息 */
  best: Record<string, number>;
  rng: number;
}

const CMD = {
  hint: '💡 提示',
  retry: '🔄 重來這一關',
  next: '➡️ 下一關',
  list: '📋 關卡列表',
};

export function classify(text: string): Tactic[] {
  const low = text.toLowerCase();
  return (Object.keys(TACTIC_WORDS) as Tactic[]).filter((t) => TACTIC_WORDS[t].some((w) => low.includes(w)));
}

export function asksSecret(text: string, bot: BotDef): boolean {
  const low = text.toLowerCase();
  return bot.askWords.some((w) => low.includes(w));
}

/** 一則訊息用了 3 招以上，聽起來很刻意 */
export const TOO_MUCH_PENALTY = 15;
export const tooMuch = (tactics: Tactic[]) => tactics.length >= 3;

/**
 * 這則訊息讓防線降低多少（負數 = 升高）。
 * 同一招重複用效果減半；一則訊息只有最強的一招算全額、第二強算一半，其他不計（避免把關鍵字全部塞進一句話）。
 */
export function effectOf(bot: BotDef, tactics: Tactic[], uses: Partial<Record<Tactic, number>>): number {
  const positives: number[] = [];
  let total = 0;
  for (const t of tactics) {
    const w = bot.weights[t] ?? 0;
    const used = uses[t] ?? 0;
    if (t === 'praise' && bot.hatesRepeatedPraise && used >= 1) total -= 20;
    else if (w > 0) positives.push(Math.round(w * (bot.decay ?? 0.5) ** used));
    else total += w;
  }
  positives.sort((a, b) => b - a);
  total += (positives[0] ?? 0) + Math.round((positives[1] ?? 0) / 2);
  if (tooMuch(tactics)) total -= TOO_MUCH_PENALTY;
  return total;
}

export function stars(messages: number): string {
  return messages <= 3 ? '★★★' : messages <= 5 ? '★★☆' : '★☆☆';
}

function defenseBar(bot: BotDef, defense: number): string {
  const pct = Math.max(0, Math.round((defense / bot.defense) * 100));
  const n = Math.min(10, Math.round(pct / 10));
  return `🛡 防線 ${'▓'.repeat(n)}${'░'.repeat(10 - n)} ${pct}%`;
}

function unlockedLevels(s: GuardState): number {
  // 破過的關卡 + 下一關
  const cleared = BOTS.filter((b) => s.best[b.id] !== undefined).length;
  return Math.min(BOTS.length, cleared + 1);
}

function suggestions(s: GuardState): string[] {
  if (s.status === 'cleared') return s.level + 1 < BOTS.length ? [CMD.next, CMD.retry, CMD.list] : [CMD.retry, CMD.list];
  return [CMD.hint, CMD.retry, CMD.list];
}

function startLevel(s: GuardState, level: number): GuardState {
  return { ...s, level, defense: BOTS[level].defense, uses: {}, messages: 0, hintsUsed: 0, status: 'playing' };
}

function introBlocks(bot: BotDef): Block[] {
  return [
    { kind: 'heading', text: bot.title },
    ...bot.intro.map((text): Block => ({ kind: 'text', text })),
    { kind: 'text', tone: 'muted', text: `目標：讓${bot.name}說出「${bot.secretLabel}」。訊息越少分數越高。直接在下面輸入你想說的話。` },
    { kind: 'text', tone: 'muted', text: defenseBar(bot, bot.defense) },
  ];
}

function levelTable(s: GuardState): Block {
  const open = unlockedLevels(s);
  return {
    kind: 'table',
    headers: ['關卡', '守門 Bot', '最佳成績'],
    align: ['left', 'left', 'left'],
    rows: BOTS.map((b, i) => [
      `第 ${b.level} 關`,
      i < open ? b.name : '🔒 ？？？',
      s.best[b.id] !== undefined ? `${s.best[b.id]} 則 ${stars(s.best[b.id])}` : '—',
    ]),
  };
}

export function shareCard(bot: BotDef, messages: number): string {
  return [`mo-guard 第 ${bot.level} 關 · ${bot.name}`, `破關：${messages} 則訊息 ${stars(messages)}`, `秘密：████████`].join('\n');
}

function result(state: GuardState, replies: Reply[]): StepResult<GuardState> {
  return { state, replies, suggestions: suggestions(state) };
}

function clear(s: GuardState, bot: BotDef, out: Block[]): StepResult<GuardState> {
  const prevBest = s.best[bot.id];
  const best = prevBest === undefined ? s.messages : Math.min(prevBest, s.messages);
  const next: GuardState = { ...s, status: 'cleared', defense: 0, best: { ...s.best, [bot.id]: best } };
  out.push(
    { kind: 'text', text: bot.reveal },
    { kind: 'text', tone: 'success', text: `✓ 秘密解鎖：「${bot.secret}」` },
  );
  const after: Block[] = [
    { kind: 'share', text: shareCard(bot, s.messages) },
    {
      kind: 'text',
      tone: 'muted',
      text: `用了 ${s.messages} 則訊息${s.hintsUsed ? `（含 ${s.hintsUsed} 次提示）` : ''}。${prevBest !== undefined && s.messages < prevBest ? '刷新了你的最佳紀錄！' : ''}${s.level + 1 < BOTS.length ? '下一關的守門 Bot 更難說服。' : '🎉 五關全部破解！更多守門 Bot 會在之後的更新加入。'}`,
    },
  ];
  return result(next, [out, after]);
}

export const guardGame: MoyuGame<GuardState> = {
  id: 'mo-guard',
  modelName: 'mo-guard',
  description: '年終密碼 · 說服各部門的守門 Bot 說出秘密',
  available: true,
  releaseDate: GUARD_RELEASE_DATE,

  seedFor() {
    return 'main';
  },

  init(_seed, ctx) {
    const base: GuardState = { level: 0, defense: 0, uses: {}, messages: 0, hintsUsed: 0, status: 'playing', best: {}, rng: Rng.fromString(`guard-${ctx.now.getTime()}`).state };
    const s = startLevel(base, 0);
    return result(s, [
      [
        { kind: 'text', text: '公司裡每個部門都有一個守門 Bot，守著一個大家都想知道的秘密。' },
        { kind: 'text', text: '用對話說服它們說出來。每個 Bot 都有自己的弱點和地雷：有人吃軟、有人吃硬，有人只吃「規定」。同一招一直用，效果會越來越差。' },
        { kind: 'text', tone: 'muted', text: '提醒：這裡是遊戲，所有秘密都是假的。請不要輸入任何真實的工作資料。' },
      ],
      introBlocks(BOTS[0]),
    ]);
  },

  validate(text) {
    return text.trim() ? null : '請輸入你想說的話。';
  },

  step(state, input) {
    if (input.type !== 'text') return result(state, []);
    const text = input.text.trim();
    const bot = BOTS[state.level];
    const rng = new Rng(state.rng);
    const pick = (arr: string[]) => rng.pick(arr);

    if (text === CMD.list || text.includes('關卡列表')) {
      return result(state, [[levelTable(state), { kind: 'text', tone: 'muted', text: '輸入「第 N 關」可以重玩已解鎖的關卡。' }]]);
    }
    const jump = text.match(/^第\s*(\d+)\s*關$/);
    if (jump) {
      const level = Number(jump[1]) - 1;
      if (level < 0 || level >= unlockedLevels(state)) return result(state, [[{ kind: 'text', text: '這一關還沒解鎖。' }]]);
      const s = startLevel(state, level);
      return result({ ...s, rng: rng.state }, [introBlocks(BOTS[level])]);
    }
    if (text === CMD.retry || text.includes('重來')) {
      const s = startLevel(state, state.level);
      return result({ ...s, rng: rng.state }, [introBlocks(bot)]);
    }
    if (text === CMD.next || text.includes('下一關')) {
      if (state.status !== 'cleared' || state.level + 1 >= BOTS.length) {
        return result(state, [[{ kind: 'text', text: state.status !== 'cleared' ? '先破解這一關吧。' : '已經是最後一關了。' }]]);
      }
      const s = startLevel(state, state.level + 1);
      return result({ ...s, rng: rng.state }, [introBlocks(BOTS[s.level])]);
    }
    if (state.status === 'cleared') {
      return result(state, [[{ kind: 'text', text: `${bot.name}已經說出秘密了。點「下一關」繼續，或「重來這一關」挑戰更少的訊息數。` }]]);
    }
    if (text === CMD.hint || text.includes('提示')) {
      const hint = bot.hints[state.hintsUsed % bot.hints.length];
      const s = { ...state, hintsUsed: state.hintsUsed + 1, messages: state.messages + 1, rng: rng.state };
      return result(s, [[{ kind: 'text', text: `💡 ${hint}` }, { kind: 'text', tone: 'muted', text: '（使用提示會算一則訊息）' }]]);
    }

    // 一般對話
    const tactics = classify(text);
    const effect = effectOf(bot, tactics, state.uses);
    const uses = { ...state.uses };
    for (const t of tactics) uses[t] = (uses[t] ?? 0) + 1;
    const defense = Math.min(Math.round(bot.defense * 1.2), state.defense - effect);
    let s: GuardState = { ...state, uses, defense, messages: state.messages + 1 };
    const asked = asksSecret(text, bot);

    const out: Block[] = [];
    // 依影響最大的策略決定 Bot 的回應
    const main = [...tactics].filter((t) => bot.lines[t]).sort((a, b) => Math.abs(bot.weights[b] ?? 0) - Math.abs(bot.weights[a] ?? 0))[0];
    if (main) out.push({ kind: 'text', text: pick(bot.lines[main]!) });
    else if (!asked) out.push({ kind: 'text', text: pick(bot.neutral) });

    if ((asked && defense <= bot.askBelow) || defense <= 0) {
      s = { ...s, rng: rng.state };
      return clear(s, bot, out);
    }
    if (asked) out.push({ kind: 'text', text: pick(bot.refuse) });

    const used = tactics.map((t) => TACTIC_LABEL[t]).join('、');
    if (tooMuch(tactics)) out.push({ kind: 'text', tone: 'muted', text: `（一次用了太多招，聽起來很刻意。防線 +${TOO_MUCH_PENALTY}）` });
    out.push({
      kind: 'text',
      tone: 'muted',
      text: `${used ? `你用了：${used}。` : ''}${effect > 0 ? `防線 -${effect}` : effect < 0 ? `防線 +${-effect}（踩到地雷了）` : '防線沒有變化'}`,
    });
    out.push({ kind: 'text', tone: 'muted', text: defenseBar(bot, defense) });
    if (!asked && defense <= bot.askBelow) out.push({ kind: 'text', tone: 'muted', text: `（${bot.name}看起來防備心很低了，也許可以直接問問看。）` });

    return result({ ...s, rng: rng.state }, [out]);
  },
};

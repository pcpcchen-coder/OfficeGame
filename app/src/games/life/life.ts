// G4 · 建議回覆人生 mo-life-sim
// 每個遊戲日，同事、主管或客戶傳一則訊息，你從 Mo 提供的 3 個建議回覆中選一個。
// 四個指標任何一項到 0 或 100 就觸發結局；目標是撐越久越好、收集全部結局。

import { Rng } from '../../engine/rng';
import type { Block, MoyuGame, Profile, Reply, StepResult } from '../../engine/types';
import {
  ENDINGS,
  ENDING_ORDER,
  EVENTS,
  METER_ENDINGS,
  TRIGGERS,
  VETERAN_DAY,
  type Choice,
  type EndingId,
  type LifeEvent,
  type Stat,
  type Stats,
} from './events';

const RECENT_LIMIT = 12;
const RESTART = '📄 重新投履歷';
const STAT_ORDER: Stat[] = ['p', 'e', 's', 'm'];
export const STAT_LABEL: Record<Stat, { name: string; icon: string }> = {
  p: { name: '績效', icon: '💼' },
  e: { name: '精神', icon: '🔋' },
  s: { name: '人緣', icon: '🤝' },
  m: { name: '荷包', icon: '💰' },
};

export interface LifeState {
  run: number;
  day: number;
  stats: Stats;
  flags: Record<string, number>;
  current: string | null;
  recent: string[];
  scheduled: Array<{ event: string; day: number }>;
  status: 'playing' | 'ended';
  ending: EndingId | null;
  rng: number;
}

const eventById = (id: string): LifeEvent => EVENTS.find((e) => e.id === id)!;

export function dayLabel(day: number): string {
  const week = Math.ceil(day / 5);
  const weekday = ['一', '二', '三', '四', '五'][(day - 1) % 5];
  return `第 ${week} 週 · 週${weekday}（Day ${day}）`;
}

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** 劇本裡寫的是「相對大小」，實際套用時放大，讓指標起伏更明顯 */
export const EFFECT_SCALE = 1.3;

function applyEffects(stats: Stats, effects: Partial<Stats> = {}, scale = EFFECT_SCALE): Stats {
  const d = (k: Stat) => Math.round((effects[k] ?? 0) * scale);
  return {
    p: clamp(stats.p + d('p')),
    e: clamp(stats.e + d('e')),
    s: clamp(stats.s + d('s')),
    m: clamp(stats.m + d('m')),
  };
}

/** 依固定順序找出第一個到底或到頂的指標 */
export function meterEnding(stats: Stats): EndingId | null {
  for (const k of STAT_ORDER) {
    if (stats[k] <= 0) return METER_ENDINGS[k].low;
    if (stats[k] >= 100) return METER_ENDINGS[k].high;
  }
  return null;
}

function bar(v: number): string {
  const filled = Math.round(v / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function metersBlock(stats: Stats): Block {
  const lines = STAT_ORDER.map((k) => {
    const v = stats[k];
    const warn = v <= 15 ? '  ⚠ 快見底了' : v >= 85 ? '  ⚠ 太滿了' : '';
    return `${STAT_LABEL[k].name} ${bar(v)} ${String(v).padStart(3)}${warn}`;
  });
  return { kind: 'code', lang: 'status', text: lines.join('\n') };
}

function deltaText(before: Stats, after: Stats): string {
  const parts = STAT_ORDER.filter((k) => after[k] !== before[k]).map((k) => {
    const d = after[k] - before[k];
    return `${STAT_LABEL[k].icon} ${STAT_LABEL[k].name} ${d > 0 ? '+' : ''}${d}`;
  });
  return parts.length ? parts.join(' · ') : '四個指標都沒變。';
}

/** 選出今天的事件：先看排程，再從符合條件的事件裡隨機挑 */
export function pickEvent(state: LifeState, rng: Rng): string {
  const due = state.scheduled.find((s) => s.day <= state.day);
  if (due) return due.event;
  const view = { day: state.day, stats: state.stats, flags: state.flags };
  const pool = EVENTS.filter(
    (e) => !e.chainOnly && (e.minDay ?? 0) <= state.day && (!e.requires || e.requires(view)) && !state.recent.includes(e.id),
  );
  const fallback = EVENTS.filter((e) => !e.chainOnly && (!e.requires || e.requires(view)));
  return rng.pick(pool.length ? pool : fallback).id;
}

function eventBlocks(state: LifeState): Block[] {
  const ev = eventById(state.current!);
  return [
    { kind: 'text', tone: 'muted', text: dayLabel(state.day) },
    { kind: 'text', text: `📨 新訊息，來自「${ev.sender}」：` },
    { kind: 'text', text: ev.message },
    { kind: 'text', tone: 'muted', text: '我幫你想了三個回覆：' },
  ];
}

function suggestions(state: LifeState): string[] {
  if (state.status === 'ended') return [RESTART];
  return eventById(state.current!).choices.map((c) => c.text);
}

/** 開始新的一天：排程的事件從清單移除、記入最近出現 */
function startDay(state: LifeState, rng: Rng): LifeState {
  const id = pickEvent(state, rng);
  return {
    ...state,
    current: id,
    scheduled: state.scheduled.filter((s) => s.event !== id),
    recent: [id, ...state.recent].slice(0, RECENT_LIMIT),
  };
}

export function newCareer(seed: string, run: number): LifeState {
  const rng = Rng.fromString(`${seed}:${run}`);
  const base: LifeState = {
    run,
    day: 1,
    stats: { p: 50, e: 50, s: 50, m: 50 },
    flags: {},
    current: null,
    recent: [],
    scheduled: [],
    status: 'playing',
    ending: null,
    rng: rng.state,
  };
  const started = startDay(base, rng);
  return { ...started, rng: rng.state };
}

function recordEnding(profile: Profile, state: LifeState, ending: EndingId): Profile {
  const endings = profile.life.endings.includes(ending) ? profile.life.endings : [...profile.life.endings, ending];
  return {
    ...profile,
    life: {
      runs: profile.life.runs + 1,
      bestDays: Math.max(profile.life.bestDays, state.day),
      endings,
    },
  };
}

export function shareCard(state: LifeState, unlocked: number): string {
  const e = state.ending ? ENDINGS[state.ending] : null;
  const s = state.stats;
  return [
    `mo-life-sim  撐了 ${state.day} 天`,
    `結局：${e ? e.title : '—'}`,
    `💼${s.p} 🔋${s.e} 🤝${s.s} 💰${s.m}`,
    `endings=${unlocked}/${ENDING_ORDER.length}`,
  ].join('\n');
}

function endingReplies(state: LifeState, profile: Profile): Reply[] {
  const ending = ENDINGS[state.ending!];
  const unlocked = profile.life.endings;
  const list = ENDING_ORDER.map((id) => (unlocked.includes(id) ? `✓ ${ENDINGS[id].title}` : '？ ？？？')).join('\n');
  return [
    [
      { kind: 'heading', text: `結局：${ending.title}` },
      { kind: 'text', text: ending.text },
      { kind: 'text', tone: ending.good ? 'success' : 'warn', text: `你撐了 ${state.day} 天。` },
    ],
    [
      { kind: 'share', text: shareCard(state, unlocked.length) },
      { kind: 'code', lang: `endings ${unlocked.length}/${ENDING_ORDER.length}`, text: list },
      { kind: 'text', tone: 'muted', text: `最長紀錄 ${profile.life.bestDays} 天 · 已經投了 ${profile.life.runs} 次履歷。想再來一次就點「重新投履歷」。` },
    ],
  ];
}

function resolveChoice(choice: Choice, rng: Rng): { effects: Partial<Stats>; result: string } {
  if (choice.gamble) {
    const outcome = rng.chance(choice.gamble.chance) ? choice.gamble.win : choice.gamble.lose;
    return { effects: outcome.effects, result: outcome.result };
  }
  return { effects: choice.effects ?? {}, result: choice.result };
}

function result(state: LifeState, replies: Reply[], profile?: Profile): StepResult<LifeState> {
  return { state, replies, suggestions: suggestions(state), profile };
}

export const lifeGame: MoyuGame<LifeState> = {
  id: 'mo-life-sim',
  modelName: 'mo-life-sim',
  description: '建議回覆人生 · 用三個建議回覆撐過職場 · 30 秒一天',
  available: true,

  seedFor() {
    return 'main';
  },

  init(_seed, ctx) {
    const state = newCareer(`life-${ctx.now.getTime()}`, ctx.profile.life.runs + 1);
    return result(state, [
      [
        { kind: 'text', text: '恭喜錄取！今天是你在雲頂未來科技的第一天。' },
        {
          kind: 'text',
          text: '每天會有人傳訊息給你，我會幫你想三個回覆。你的選擇會影響四個指標：績效、精神、人緣、荷包。',
        },
        { kind: 'text', tone: 'muted', text: '任何一項掉到 0 或衝到 100 都會觸發結局。數值變化要選了才知道。目標：撐越久越好，收集全部 14 種結局。' },
        metersBlock(state.stats),
      ],
      eventBlocks(state),
    ]);
  },

  validate(text, state) {
    if (state.status === 'ended') return text.includes('履歷') ? null : '這段職涯結束了。點「重新投履歷」再來一次。';
    if (/^[123]$/.test(text.trim())) return null;
    if (eventById(state.current!).choices.some((c) => c.text === text)) return null;
    return '請從下面三個建議回覆中選一個（也可以輸入 1、2、3）。';
  },

  step(state, input, ctx) {
    if (input.type !== 'text') return result(state, []);
    const text = input.text.trim();

    if (state.status === 'ended') {
      if (!text.includes('履歷')) return result(state, []);
      const next = newCareer(`life-${ctx.now.getTime()}`, state.run + 1);
      return result(next, [
        [{ kind: 'text', text: '你投出了新的履歷。新公司、新座位、同一個 Mo。' }, metersBlock(next.stats)],
        eventBlocks(next),
      ]);
    }

    const ev = eventById(state.current!);
    const choice = /^[123]$/.test(text) ? ev.choices[Number(text) - 1] : ev.choices.find((c) => c.text === text);
    if (!choice) return result(state, []);

    const rng = new Rng(state.rng);
    const outcome = resolveChoice(choice, rng);
    const before = state.stats;
    let stats = applyEffects(before, outcome.effects);
    const flags = { ...state.flags };
    const scheduled = [...state.scheduled];
    if (choice.count) flags[choice.count] = (flags[choice.count] ?? 0) + 1;
    if (choice.schedule) scheduled.push({ event: choice.schedule.event, day: state.day + choice.schedule.inDays });
    for (const t of TRIGGERS) {
      const key = `${t.event}:queued`;
      if ((flags[t.flag] ?? 0) >= t.atLeast && !flags[key]) {
        flags[key] = 1;
        scheduled.push({ event: t.event, day: state.day + t.inDays });
      }
    }

    const blocks: Block[] = [];
    if (outcome.result) blocks.push({ kind: 'text', text: outcome.result });
    blocks.push({ kind: 'text', tone: 'muted', text: deltaText(before, stats) });

    // 週末與發薪日（結局判定前先套用，讓節奏比較寬鬆）
    const weekend = state.day % 5 === 0;
    const payday = state.day % 10 === 0;
    let ending: EndingId | null = choice.ending ?? meterEnding(stats);
    if (!ending && (weekend || payday)) {
      const extra: Partial<Stats> = { e: weekend ? 6 : 0, m: payday ? 5 : 0 };
      const afterBonus = applyEffects(stats, extra, 1);
      const notes: string[] = [];
      if (weekend) notes.push('週末到了，你睡到自然醒。🔋 精神 +6');
      if (payday) notes.push('發薪日！💰 荷包 +5');
      blocks.push({ kind: 'text', tone: 'muted', text: notes.join('　') });
      stats = afterBonus;
      ending = meterEnding(stats);
    }
    if (!ending && state.day >= VETERAN_DAY) ending = 'veteran';

    if (ending) {
      const ended: LifeState = { ...state, stats, flags, scheduled, status: 'ended', ending, current: null, rng: rng.state };
      const profile = recordEnding(ctx.profile, ended, ending);
      blocks.push(metersBlock(stats));
      return result(ended, [blocks, ...endingReplies(ended, profile)], profile);
    }

    blocks.push(metersBlock(stats));
    let next: LifeState = { ...state, day: state.day + 1, stats, flags, scheduled };
    next = startDay(next, rng);
    next = { ...next, rng: rng.state };
    return result(next, [blocks, eventBlocks(next)]);
  },
};

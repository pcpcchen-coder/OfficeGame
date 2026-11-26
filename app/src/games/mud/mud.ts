// 主力遊戲 · 《B13 之龍》mo-mud-b13 · 第一章「入職」、第二章「加班」、第三章「B13」、終章、二周目
// 文字 MUD：在雲頂大樓裡移動、巡邏、戰鬥、升級，最終目標是 B13 的龍「季末」。
// 一則訊息 = 一個動作；戰鬥中關掉也會停在原處。每天 20 點精力，用完就明天再來。

import { taipeiDateString, taipeiDayIndex } from '../../engine/date';
import { Rng } from '../../engine/rng';
import type { Block, MoyuGame, Reply, StepContext, StepResult } from '../../engine/types';
import {
  AUNTIE_LINES,
  AUNTIE_QUEST,
  BOSS_MIN_LEVEL,
  BOSSES,
  CLASSES,
  CREDITS,
  ENDINGS,
  GUARD_LINES_CH3,
  KPI_CH3,
  RARE_DROPS_CH3,
  DROP_CHANCE,
  ENEMIES,
  FLOORS,
  GOSSIP,
  GUARD_LINES,
  GUARD_LINES_CH2,
  ITEMS,
  itemLabel,
  KPI_LINES,
  KPI_QUEST_KILLS,
  MAX_ENERGY,
  PATROL_EVENTS,
  PERK_TIERS,
  PERKS,
  RARE_DROPS,
  ROOMS,
  SHOP_ITEMS,
  SKILL_COOLDOWN,
  type ClassId,
  type EndingKey,
  type EnemyId,
  type FloorDef,
  type ItemId,
  type PerkDef,
  type RoomId,
} from './data';
import { isOpen, releaseNote, type ReleaseKey } from './releases';

export interface Combat {
  enemy: EnemyId;
  hp: number;
  atk: number;
  turn: number;
  /** 對手愣住的剩餘回合 */
  stun: number;
  /** 下一次攻擊會被閃過並反擊 */
  dodge: boolean;
  /** 用過「話術」，勝利時金錢 +50% */
  talked: boolean;
  /** 第二章 Boss 血量過半後暴怒 */
  enraged?: boolean;
  /** 這場戰鬥的最大 HP（二周目會放大） */
  maxHp: number;
  /** 經驗與金錢倍率（二周目） */
  scale: number;
  /** 季末的戰鬥階段（1~3） */
  stage?: number;
  /** 下一回合被季末吃掉 */
  skipNext?: boolean;
  /** 阿桂姨的最後便當已經送到 */
  auntieUsed?: boolean;
}

export interface NewsItem {
  at: string;
  text: string;
}

export interface MudState {
  /** finale = 打倒季末後選擇結局 */
  phase: 'create' | 'explore' | 'combat' | 'finale';
  cls: ClassId | null;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  baseAtk: number;
  baseDef: number;
  gold: number;
  room: RoomId;
  energy: number;
  energyDay: number;
  weapon: ItemId | null;
  armor: ItemId | null;
  bag: Partial<Record<ItemId, number>>;
  combat: Combat | null;
  skillCd: number;
  fragments: number;
  flags: Record<string, number>;
  news: NewsItem[];
  rng: number;
}

// ---------- 數值 ----------

export const expToNext = (level: number) => Math.round(25 * level ** 1.6);
export const atkOf = (s: MudState) => s.baseAtk + (s.weapon ? (ITEMS[s.weapon].atk ?? 0) : 0);
export const perk = (s: MudState, tier: 5 | 7 | 9) => s.flags[`perk${tier}`] ?? 0;
/** 精力上限（天賦「早鳥」+5） */
export const energyMax = (s: MudState) => MAX_ENERGY + (perk(s, 5) === 2 ? 5 : 0);
export const skillCooldown = (s: MudState) => SKILL_COOLDOWN - (perk(s, 7) === 2 ? 1 : 0);

/** 台灣時間 19:00~07:00 是夜間 */
export function isNight(now: Date): boolean {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return h >= 19 || h < 7;
}

/** 時間與預覽模式：決定哪些段落已經開放 */
export interface Env {
  now: Date;
  preview: boolean;
}

export const opened = (key: ReleaseKey, env: Env) => isOpen(key, env.now, env.preview);

export const floorOpen = (f: FloorDef, s: MudState, env: Env) =>
  f.room !== null && (!f.requires || !!s.flags[f.requires]) && (!f.release || opened(f.release, env));
export const floorLabel = (f: FloorDef, s: MudState, env: Env) => (floorOpen(f, s, env) ? f.label : `${f.label.split(' ')[0]} 🔒`);

/** 二周目的強度倍率 */
export const ngScale = (s: MudState) => 1 + 0.15 * (s.flags.ng ?? 0);

/** 還沒選的天賦（等級最低的那一層） */
export function pendingPerkTier(s: MudState): 5 | 7 | 9 | null {
  for (const tier of PERK_TIERS) if (s.level >= tier && !perk(s, tier)) return tier;
  return null;
}

export function shopItems(s: MudState, env: Env): ItemId[] {
  return SHOP_ITEMS.filter((id) => {
    const ch = ITEMS[id].chapter;
    if (ch === 2) return !!s.flags.boss1;
    if (ch === 3) return !!s.flags.boss2 && opened('ch3', env);
    return true;
  });
}
export const defOf = (s: MudState) => s.baseDef + (s.armor ? (ITEMS[s.armor].def ?? 0) : 0);

export function damage(atk: number, def: number, rng: Rng): number {
  return Math.max(1, atk + rng.int(3) - def);
}

/** 換日時回滿精力 */
export function refreshEnergy(s: MudState, now: Date): { state: MudState; refreshed: boolean } {
  const today = taipeiDayIndex(now);
  if (s.energyDay === today) return { state: s, refreshed: false };
  return { state: { ...s, energy: energyMax(s), energyDay: today }, refreshed: s.energyDay !== -1 };
}

function stamp(now: Date): string {
  const d = taipeiDateString(now).slice(5).replace('-', '/');
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' }).format(now);
  return `${d} ${t}`;
}

function addNews(s: MudState, now: Date, text: string): MudState {
  return { ...s, news: [{ at: stamp(now), text }, ...s.news].slice(0, 10) };
}

// ---------- 畫面 ----------

function statusLine(s: MudState, now: Date): Block {
  return {
    kind: 'text',
    tone: 'muted',
    text: `Lv${s.level} ${CLASSES[s.cls!].name} · HP ${s.hp}/${s.maxHp} · 攻 ${atkOf(s)} 防 ${defOf(s)} · 💰 ${s.gold} · ⚡ ${s.energy}/${energyMax(s)} · EXP ${s.exp}/${expToNext(s.level)}${isNight(now) ? ' · 🌙 夜間' : ''}`,
  };
}

function roomBlock(s: MudState, env: Env): Block {
  const r = ROOMS[s.room];
  const night = isNight(env.now);
  const exits = s.room === 'store' ? '出口：大廳' : s.room === 'elevator' ? '出口：選擇樓層' : '出口：電梯';
  const lines = [`【${r.title}】`, ...r.desc];
  if (night && r.nightDesc) lines.push(`🌙 ${r.nightDesc}`);
  if (s.room === 'elevator') lines.push(`按鈕：${FLOORS.map((f) => floorLabel(f, s, env)).join(' · ')}`);
  lines.push(exits);
  if (r.enemies) {
    const pool = [...r.enemies, ...(night ? (r.nightEnemies ?? []) : [])];
    lines.push(`這一層的出沒：${pool.map((e) => ENEMIES[e].name).join('、')}`);
    if (!night && r.nightEnemies) lines.push('（聽說晚上還有別的東西出沒）');
  }
  return { kind: 'code', lang: 'room', text: lines.join('\n') };
}

function sheetBlock(s: MudState): Block {
  const c = CLASSES[s.cls!];
  const w = s.weapon ? itemLabel(s.weapon) : '（空手）';
  const a = s.armor ? itemLabel(s.armor) : '（襯衫）';
  const pad = (t: string, n: number) => t + ' '.repeat(Math.max(1, n - [...t].reduce((x, ch) => x + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)));
  const rows = [
    `${pad('職業  ' + c.name, 22)}等級  ${s.level}`,
    `${pad(`HP    ${s.hp}/${s.maxHp}`, 22)}EXP   ${s.exp}/${expToNext(s.level)}`,
    `${pad(`攻擊  ${atkOf(s)}`, 22)}防禦  ${defOf(s)}`,
    `${pad('武器  ' + w, 22)}防具  ${a}`,
    `${pad(`金錢  ${s.gold}`, 22)}精力  ${s.energy}/${energyMax(s)}`,
    `${pad(`技能  ${c.skill}`, 22)}碎片  ${s.fragments}/3`,
  ];
  const endings = (Object.keys(ENDINGS) as EndingKey[]).filter((k) => s.flags[`end_${k}`]).length;
  if (endings || s.flags.ng) rows.push(`${pad(`結局  ${endings}/${Object.keys(ENDINGS).length}`, 22)}周目  ${(s.flags.ng ?? 0) + 1}`);
  const perks = PERK_TIERS.map((tier) => PERKS.find((p) => p.tier === tier && p.choice === perk(s, tier))?.name).filter(Boolean);
  if (perks.length) rows.push(`天賦  ${perks.join('、')}`);
  const quests: string[] = [];
  if (s.flags.qThermos === 1) quests.push('找阿桂姨的保溫杯（9F）');
  if (s.flags.qThermos === 2) quests.push('把保溫杯還給阿桂姨（2F）');
  if (s.flags.qKpi === 1) quests.push(`KPI-9000 的稽核 ${Math.min(KPI_QUEST_KILLS, s.flags.kpiKills ?? 0)}/${KPI_QUEST_KILLS}（10F、11F）`);
  if (quests.length) rows.push(`任務  ${quests.join('；')}`);
  return { kind: 'code', lang: 'character', text: rows.join('\n') };
}

function combatBlock(s: MudState): Block {
  const c = s.combat!;
  const e = ENEMIES[c.enemy];
  const stage = c.enemy === 'kimatsu' ? `  第 ${c.stage ?? 1} 階段` : '';
  const bar = (v: number, max: number) => {
    const n = Math.min(12, Math.max(0, Math.round((v / max) * 12)));
    return '█'.repeat(n) + '░'.repeat(12 - n);
  };
  return {
    kind: 'code',
    lang: 'battle',
    text: [
      `${e.name}${stage}`,
      `HP ${bar(c.hp, c.maxHp)} ${Math.max(0, c.hp)}/${c.maxHp}${c.stun > 0 ? '  (愣住)' : ''}`,
      '',
      `你（${CLASSES[s.cls!].name}）`,
      `HP ${bar(s.hp, s.maxHp)} ${s.hp}/${s.maxHp}`,
      `回合 ${c.turn}  技能 ${s.skillCd > 0 ? `冷卻 ${s.skillCd}` : '可用'}${c.skipNext ? '  ⚠ 下一回合會被吃掉' : ''}`,
    ].join('\n'),
  };
}

const t = (text: string, tone?: 'muted' | 'success' | 'warn'): Block => ({ kind: 'text', text, ...(tone ? { tone } : {}) });

function consumableButtons(s: MudState): string[] {
  const out: string[] = [];
  if ((s.bag.coffee ?? 0) > 0) out.push(`☕ 喝美式咖啡（${s.bag.coffee}）`);
  if ((s.bag.boba ?? 0) > 0) out.push(`🧋 喝珍奶（${s.bag.boba}）`);
  if ((s.bag.energy ?? 0) > 0) out.push(`⚡ 喝能量飲（${s.bag.energy}）`);
  if ((s.bag.bento ?? 0) > 0) out.push(`🍱 吃愛心便當（${s.bag.bento}）`);
  if ((s.bag['super-energy'] ?? 0) > 0) out.push(`🥫 喝超級能量飲（${s.bag['super-energy']}）`);
  return out;
}

function perkButtons(s: MudState): string[] {
  const tier = pendingPerkTier(s);
  if (!tier) return [];
  return PERKS.filter((p) => p.tier === tier).map((p) => `🌱 天賦：${p.name}`);
}

export function endingChoices(s: MudState): EndingKey[] {
  return (Object.keys(ENDINGS) as EndingKey[]).filter((k) => !('requires' in ENDINGS[k]) || s.flags.qKpi === 2);
}

export function suggestions(s: MudState, env: Env): string[] {
  if (s.phase === 'create') return ['💻 工程師', '📞 業務', '🎨 設計師'];
  if (s.phase === 'finale') return endingChoices(s).map((k) => ENDINGS[k].choice);
  if (s.phase === 'combat') {
    const c = CLASSES[s.cls!];
    return ['⚔️ 攻擊', s.skillCd > 0 ? `✨ ${c.skill}（冷卻 ${s.skillCd}）` : `✨ ${c.skill}`, ...consumableButtons(s), '🏃 逃跑'];
  }
  const hurt = s.hp < s.maxHp ? consumableButtons(s) : [];
  const perks = perkButtons(s);
  const boss = BOSSES.find((b) => b.room === s.room && b.room !== 'meeting' && b.room !== 'exec');
  switch (s.room) {
    case 'lobby':
      return [
        ...perks,
        ...(s.flags.cleared && opened('ngplus', env) ? ['🔁 轉職（二周目）'] : []),
        '📰 公告欄',
        '💬 跟保全大叔聊天',
        '🏪 便利商店',
        '🛗 搭電梯',
        '📋 狀態',
      ];
    case 'store':
      return [...shopItems(s, env).map((id) => `買 ${ITEMS[id].name}（${ITEMS[id].price}）`), '🚪 回大廳'];
    case 'pantry':
      return [...perks, '😴 休息（1 精力）', '💬 跟阿桂姨聊天', ...hurt, '🛗 搭電梯', '📋 狀態'];
    case 'elevator':
      return FLOORS.map((f) => floorLabel(f, s, env));
    case 'meeting':
      return [...perks, '⚔️ 巡邏', '🚪 進入大會議室', ...hurt, '🛗 搭電梯', '📋 狀態'];
    case 'it':
      return [...perks, '⚔️ 巡邏', '💬 跟 KPI-9000 說話', ...hurt, '🛗 搭電梯', '📋 狀態'];
    case 'exec':
      return [...perks, '🚪 敲董事長室的門', ...hurt, '🛗 搭電梯', '📋 狀態'];
    case 'b13':
      return [...perks, '🐉 喚醒季末', ...hurt, '🛗 搭電梯', '📋 狀態'];
    case 'b-parking':
    case 'b-archive':
    case 'b-server':
      return [...perks, '⚔️ 巡邏', boss!.button, ...hurt, '🛗 搭電梯', '📋 狀態'];
    default:
      return [...perks, '⚔️ 巡邏', ...hurt, '🛗 搭電梯', '👀 看看四周', '📋 狀態'];
  }
}

// ---------- 指令 ----------

export type Command =
  | { type: 'class'; cls: ClassId }
  | { type: 'patrol' }
  | { type: 'elevator' }
  | { type: 'floor'; index: number }
  | { type: 'look' }
  | { type: 'status' }
  | { type: 'news' }
  | { type: 'talk-guard' }
  | { type: 'talk-auntie' }
  | { type: 'talk-kpi' }
  | { type: 'ending'; key: EndingKey }
  | { type: 'ngplus' }
  | { type: 'perk'; perk: PerkDef }
  | { type: 'store' }
  | { type: 'buy'; item: ItemId }
  | { type: 'leave-store' }
  | { type: 'rest' }
  | { type: 'boss' }
  | { type: 'attack' }
  | { type: 'skill' }
  | { type: 'use'; item: ItemId }
  | { type: 'flee' };

export function parseCommand(raw: string, s: MudState): Command | null {
  const text = raw.trim();
  const low = text.toLowerCase();
  if (s.phase === 'finale') {
    const key = endingChoices(s).find((k) => text === ENDINGS[k].choice || text.includes(ENDINGS[k].choice.slice(2)));
    return key ? { type: 'ending', key } : null;
  }
  if (s.phase === 'create') {
    if (text.includes('工程師') || low === 'engineer') return { type: 'class', cls: 'engineer' };
    if (text.includes('業務') || low === 'sales') return { type: 'class', cls: 'sales' };
    if (text.includes('設計師') || low === 'designer') return { type: 'class', cls: 'designer' };
    return null;
  }
  // 天賦要比道具先判斷：「咖啡因耐受」裡面有「咖啡」
  if (s.phase === 'explore' && text.includes('天賦')) {
    const p = PERKS.find((x) => text.includes(x.name));
    return p ? { type: 'perk', perk: p } : null;
  }
  if (!text.startsWith('買')) {
    if (text.includes('咖啡')) return { type: 'use', item: 'coffee' };
    if (text.includes('珍奶')) return { type: 'use', item: 'boba' };
    if (text.includes('超級能量飲')) return { type: 'use', item: 'super-energy' };
    if (text.includes('能量飲')) return { type: 'use', item: 'energy' };
    if (text.includes('便當')) return { type: 'use', item: 'bento' };
  }
  if (s.phase === 'combat') {
    if (text.includes('攻擊') || low === 'attack' || low === 'a') return { type: 'attack' };
    if (text.includes(CLASSES[s.cls!].skill) || text.includes('技能') || low === 'skill') return { type: 'skill' };
    if (text.includes('逃') || low === 'flee') return { type: 'flee' };
    return null;
  }
  if (text.startsWith('買')) {
    // 名稱較長的先比對（「降噪 Pro 耳機」要比「降噪耳機」先）
    const item = [...SHOP_ITEMS].sort((a, b) => ITEMS[b].name.length - ITEMS[a].name.length).find((id) => text.includes(ITEMS[id].name));
    return item ? { type: 'buy', item } : null;
  }
  const floor = FLOORS.findIndex((f) => {
    const key = f.label.split(' ')[0];
    return text === f.label || text.toUpperCase() === key || text.toUpperCase().startsWith(key + ' ');
  });
  if (s.room === 'elevator' && floor >= 0) return { type: 'floor', index: floor };
  if (/^go\s+(b\d+|\d+f?)$/i.test(low)) {
    const target = low.replace(/^go\s+/, '').toUpperCase().replace(/^(\d+)$/, '$1F');
    const i = FLOORS.findIndex((f) => f.label.split(' ')[0] === target);
    if (i >= 0) return { type: 'floor', index: i };
  }
  if (text.includes('巡邏') || low === 'patrol' || low === 'hunt') return { type: 'patrol' };
  if (text.includes('電梯') || low === 'elevator') return { type: 'elevator' };
  if (text.includes('看看四周') || low === 'look' || low === 'l') return { type: 'look' };
  if (text.includes('狀態') || low === 'stat' || low === 'status') return { type: 'status' };
  if (text.includes('公告欄') || low === 'news') return { type: 'news' };
  if (text.includes('保全')) return { type: 'talk-guard' };
  if (text.includes('阿桂姨')) return { type: 'talk-auntie' };
  if (text.toUpperCase().includes('KPI')) return { type: 'talk-kpi' };
  if (text.includes('便利商店') || low === 'shop') return { type: 'store' };
  if (text.includes('回大廳')) return { type: 'leave-store' };
  if (text.includes('休息') || low === 'rest') return { type: 'rest' };
  if (BOSSES.some((b) => text === b.button || text.includes(b.button.slice(2))) || text.includes('大會議室') || low === 'boss') {
    return { type: 'boss' };
  }
  if (text.includes('轉職') || text.includes('二周目')) return { type: 'ngplus' };
  return null;
}

// ---------- 規則 ----------

export function newCharacter(seed: string, now: Date): MudState {
  return {
    phase: 'create',
    cls: null,
    level: 1,
    exp: 0,
    hp: 1,
    maxHp: 1,
    baseAtk: 0,
    baseDef: 0,
    gold: 20,
    room: 'lobby',
    energy: MAX_ENERGY,
    energyDay: taipeiDayIndex(now),
    weapon: null,
    armor: null,
    bag: { coffee: 2 },
    combat: null,
    skillCd: 0,
    fragments: 0,
    flags: {},
    news: [],
    rng: Rng.fromString(seed).state,
  };
}

function gainExp(s: MudState, exp: number, out: Block[], now: Date): MudState {
  let next = { ...s, exp: s.exp + exp };
  while (next.exp >= expToNext(next.level)) {
    next = {
      ...next,
      exp: next.exp - expToNext(next.level),
      level: next.level + 1,
      maxHp: next.maxHp + 6,
      baseAtk: next.baseAtk + 2,
      baseDef: next.baseDef + 1,
    };
    next = { ...next, hp: next.maxHp };
    out.push(t(`⬆ 升級了！你現在是 Lv${next.level}。最大 HP +6、攻擊 +2、防禦 +1，HP 回滿。`, 'success'));
    next = addNews(next, now, `升到了 Lv${next.level}`);
    if (next.level === BOSS_MIN_LEVEL) out.push(t('你感覺自己夠格參加 7 樓大會議室的那場週會了。', 'muted'));
    if ((PERK_TIERS as readonly number[]).includes(next.level)) out.push(t('🌱 你可以選一個新的天賦了（看下面的按鈕）。', 'muted'));
    if (next.level === 9 && next.flags.boss1) out.push(t('你感覺 12 樓董事長室的那盞燈，好像在等你。', 'muted'));
  }
  return next;
}

function startCombat(s: MudState, enemy: EnemyId): MudState {
  const e = ENEMIES[enemy];
  const scale = ngScale(s);
  const hp = Math.round(e.hp * scale);
  return {
    ...s,
    phase: 'combat',
    combat: { enemy, hp, maxHp: hp, atk: Math.round(e.atk * scale), scale, turn: 1, stun: 0, dodge: false, talked: false, stage: 1 },
  };
}

/** Boss 的特殊行動 */
function bossAction(s: MudState, c: Combat, rng: Rng, out: Block[]): MudState {
  let next = s;
  if (c.enemy === 'weekly-meeting' && c.turn % 3 === 0) {
    const heal = Math.min(10, c.maxHp - c.hp);
    c.hp += heal;
    c.atk += 1;
    out.push(t(`⏰ 週會宣布「再延長 10 分鐘」！它回復了 ${heal} HP，攻擊力變成 ${c.atk}。`, 'warn'));
  }
  if (c.enemy === 'airdrop-project') {
    if (!c.enraged && c.hp <= c.maxHp / 2) {
      c.enraged = true;
      c.atk += 3;
      out.push(t(`📞 專案接到一通電話：「老闆說明天早上就要。」它暴怒了！攻擊力變成 ${c.atk}。`, 'warn'));
    }
    if (c.turn % 4 === 0) {
      c.atk += 2;
      out.push(t(`📝「需求變更」！專案多了三個新功能，攻擊力變成 ${c.atk}。你的技能被打斷，要重新冷卻。`, 'warn'));
      next = { ...next, skillCd: Math.max(next.skillCd, skillCooldown(next) + 1) };
    }
  }
  if (c.enemy === 'kimatsu') {
    const ratio = c.hp / c.maxHp;
    const stage = ratio > 2 / 3 ? 1 : ratio > 1 / 3 ? 2 : 3;
    if (stage > (c.stage ?? 1)) {
      c.stage = stage;
      if (stage === 2) out.push(t('🐉 第二階段「吞噬週末」：季末張開嘴巴，開始吸走周圍的時間。小心，牠會吃掉你的回合！', 'warn'));
      if (stage === 3) {
        c.atk += 4;
        out.push(t(`🐉 第三階段「年終結算」：季末全身亮起紅色的數字，攻擊力暴增到 ${c.atk}！`, 'warn'));
        if (next.flags.qKpi === 2) out.push(t('📡 喇叭裡傳來 KPI-9000 的聲音：「偵測到你在 B13。啟動遠端支援。」', 'success'));
      }
    }
    if ((c.stage ?? 1) >= 2 && !c.skipNext && rng.chance(0.25)) {
      if ((next.bag.pto ?? 0) > 0) {
        next = { ...next, bag: { ...next.bag, pto: (next.bag.pto ?? 0) - 1 } };
        out.push(t('季末朝你的行事曆咬下去——你亮出一張特休假單！牠咬了個空。（特休假單 -1）', 'success'));
      } else {
        c.skipNext = true;
        out.push(t('季末一口吞掉了你的週末。你的下一回合會被吃掉！', 'warn'));
      }
    }
    if ((c.stage ?? 1) === 3 && next.flags.qKpi === 2) {
      c.hp -= 15;
      out.push(t('KPI-9000 的防火牆從天花板射出一道光，對季末造成 15 點傷害。'));
    }
    if ((c.stage ?? 1) === 3 && next.flags.qThermos === 3 && !c.auntieUsed && next.hp < next.maxHp * 0.4) {
      c.auntieUsed = true;
      next = { ...next, hp: next.maxHp };
      out.push(t('🍱 樓梯間傳來腳步聲。阿桂姨喘著氣衝進來：「你這孩子，餓著肚子怎麼打！」她塞給你一個便當。HP 回滿！', 'success'));
    }
  }
  return next;
}

function enemyTurn(s: MudState, rng: Rng, out: Block[]): MudState {
  const c = { ...s.combat! };
  const e = ENEMIES[c.enemy];
  let next = s;
  if (e.boss) next = bossAction(next, c, rng, out);
  if (c.hp <= 0) return { ...next, combat: c };
  if (c.stun > 0) {
    c.stun -= 1;
    out.push(t(`${e.name}還愣在那裡，不知道該說什麼。`, 'muted'));
  } else if (c.dodge) {
    c.dodge = false;
    const counter = damage(atkOf(next), e.def, rng);
    c.hp -= counter;
    out.push(t(`${e.name}出手了，但你早就改好稿了。你閃開並反擊，造成 ${counter} 點傷害。`));
  } else {
    const dmg = damage(c.atk, defOf(next), rng);
    next = { ...next, hp: Math.max(0, next.hp - dmg) };
    out.push(t(`${rng.pick(e.attacks)}你受到 ${dmg} 點傷害。`));
  }
  c.turn += 1;
  return { ...next, combat: c, skillCd: Math.max(0, next.skillCd - 1) };
}

/** 掉落的裝備比身上的好就換上，否則賣掉換錢 */
function receiveGear(s: MudState, item: ItemId, out: Block[]): MudState {
  const def = ITEMS[item];
  const slot = def.kind === 'weapon' ? 'weapon' : 'armor';
  const current = s[slot];
  const power = (id: ItemId | null) => (id ? (ITEMS[id].atk ?? ITEMS[id].def ?? 0) : 0);
  if (power(item) > power(current)) {
    out.push(t(`你裝備上了 ${itemLabel(item)}。${def.desc}`, 'success'));
    return { ...s, [slot]: item };
  }
  const value = Math.max(50, Math.round((power(item) * 20) / 2));
  out.push(t(`你身上的裝備比較好，把 ${itemLabel(item)} 賣給了便利商店，拿到 💰 ${value}。`));
  return { ...s, gold: s.gold + value };
}

const CH2_ROOMS: RoomId[] = ['mkt', 'fin', 'legal', 'it'];
const CH3_ROOMS: RoomId[] = ['b-parking', 'b-archive', 'b-server'];

function winCombat(s: MudState, rng: Rng, out: Block[], env: Env): MudState {
  const now = env.now;
  const c = s.combat!;
  const e = ENEMIES[c.enemy];
  const mult = (c.talked ? 1.5 : 1) * (perk(s, 9) === 2 ? 1.3 : 1) * c.scale;
  const gold = Math.round(e.gold * mult);
  const exp = Math.round(e.exp * c.scale);
  out.push(t(e.defeat), t(`✓ 打倒了${e.name}！獲得 ${exp} EXP、💰 ${gold}${c.talked ? '（話術加成）' : ''}。`, 'success'));
  let next: MudState = { ...s, phase: 'explore', combat: null, skillCd: 0, gold: s.gold + gold };
  next = addNews(next, now, `打倒了「${e.name}」`);
  next = gainExp(next, exp, out, now);

  // KPI-9000 的稽核任務
  const audited = [...(ROOMS.legal.enemies ?? []), ...(ROOMS.legal.nightEnemies ?? []), ...(ROOMS.it.enemies ?? []), ...(ROOMS.it.nightEnemies ?? [])];
  if (next.flags.qKpi === 1 && audited.includes(c.enemy)) {
    const kills = (next.flags.kpiKills ?? 0) + 1;
    next = { ...next, flags: { ...next.flags, kpiKills: kills } };
    out.push(t(kills >= KPI_QUEST_KILLS ? `稽核完成 ${KPI_QUEST_KILLS}/${KPI_QUEST_KILLS}。回 11F 找 KPI-9000 回報吧。` : `稽核進度 ${kills}/${KPI_QUEST_KILLS}。`, 'muted'));
  }

  // 稀有掉落
  const pool = !e.boss && CH2_ROOMS.includes(s.room) ? RARE_DROPS : !e.boss && CH3_ROOMS.includes(s.room) ? RARE_DROPS_CH3 : null;
  if (pool && rng.chance(e.night ? DROP_CHANCE * 2 : DROP_CHANCE)) {
    const drop = rng.pick(pool);
    out.push(t(`✨ ${e.name}掉下了一件閃閃發光的東西：${itemLabel(drop)}！`, 'success'));
    next = addNews(next, now, `撿到了稀有裝備「${ITEMS[drop].name}」`);
    next = receiveGear(next, drop, out);
  }

  const boss = BOSSES.find((b) => b.enemy === c.enemy);
  if (boss && !next.flags[boss.flag]) {
    next = { ...next, flags: { ...next.flags, [boss.flag]: 1 } };
    if (boss.flag === 'boss1') {
      next = { ...next, fragments: next.fragments + 1, flags: { ...next.flags, ch2intro: 1 } };
      next = addNews(next, now, '終結了無限延長的週會，取得權限卡碎片');
      out.push(
        t('白板背面貼著一張卡片，上面印著「B13 · 1/3」。你取得了第一片權限卡碎片！', 'success'),
        t('稱號解鎖：「會議終結者」。', 'muted'),
        t('🎉 第一章《入職》完成！'),
        ...chapterTwoIntro(),
      );
    } else if (boss.flag === 'boss2') {
      next = { ...next, fragments: next.fragments + 1 };
      next = addNews(next, now, '讓凌晨兩點的空降專案結案，取得第二片權限卡碎片');
      out.push(
        t('灰燼裡的卡片印著「B13 · 2/3」。你取得了第二片權限卡碎片！', 'success'),
        t('稱號解鎖：「準時下班的人」。董事長室的燈，第一次熄滅了。', 'muted'),
        t('🎉 第二章《加班》完成！'),
      );
      if (opened('ch3', env)) {
        next = { ...next, flags: { ...next.flags, ch3intro: 1 } };
        out.push(...chapterThreeIntro());
      } else {
        out.push(t(`KPI-9000 說，第三片碎片在季末的肚子裡。${releaseNote('ch3')}，你可以繼續在各樓層練功、收集稀有裝備。`, 'muted'));
      }
    } else if (boss.flag === 'mb1') {
      next = addNews(next, now, '打倒了 B4 的拖吊車之王');
      out.push(t('🔓 電梯的 B5 檔案室解鎖了。', 'success'));
    } else if (boss.flag === 'mb2') {
      next = addNews(next, now, '讓 B8 的檔案管理員安息');
      out.push(t('🔓 電梯的 B9 舊機房解鎖了。', 'success'));
    } else if (boss.flag === 'mb3') {
      next = addNews(next, now, '關掉了 B12 的大型主機');
      out.push(
        t('🔓 電梯的 B13 按鈕亮了。', 'success'),
        t(opened('finale', env) ? '你感覺到腳下傳來巨大的呼吸聲。季末，就在下面。' : `腳下傳來巨大的呼吸聲……${releaseNote('finale')}。`, 'muted'),
      );
    } else if (boss.flag === 'dragon') {
      next = { ...next, fragments: 3, phase: 'finale' };
      next = addNews(next, now, '在 B13 打倒了季末');
      out.push(
        t('卡片上印著「B13 · 3/3」。三片權限卡碎片在你手中拼成了一張完整的卡。', 'success'),
        t('季末趴在地上，喘著氣。牠看著你，眼神裡沒有憤怒，只有疲憊。', 'muted'),
        t('你要怎麼做？'),
      );
    }
  }
  return next;
}

function chapterTwoIntro(): Block[] {
  return [
    { kind: 'heading', text: '第二章《加班》' },
    t('電梯的 8F 到 12F 按鈕同時亮了起來。'),
    t('8 樓以上的燈，從來沒有在晚上關過。那些樓層的人都在加班——或者說，曾經是人。保全大叔說，第二片碎片在 12 樓的董事長室。'),
    t('新內容：8F~11F 四個新樓層、晚上 7 點到早上 7 點才會出現的夜間怪物、Lv5/7/9 的天賦、阿桂姨和 KPI-9000 的任務、便利商店的新商品，以及只會從怪物身上掉落的★稀有裝備。', 'muted'),
  ];
}

function chapterThreeIntro(): Block[] {
  return [
    { kind: 'heading', text: '第三章《B13》' },
    t('你手上有兩片碎片。第三片，在季末的肚子裡。'),
    t('去 11F 找 KPI-9000 吧。它說它有辦法讓你下到地下樓層。'),
    t('新內容：B1~B12 三個地下區域、三隻守關 Boss、便利商店的新商品（超級能量飲、特休假單、三螢幕工作站、人體工學椅），以及地下樓層才會掉落的★稀有裝備。', 'muted'),
  ];
}

function loseCombat(s: MudState, out: Block[], now: Date): MudState {
  const e = ENEMIES[s.combat!.enemy];
  const lost = Math.floor(s.gold * 0.1);
  out.push(
    t(`你被${e.name}擊倒了……`, 'warn'),
    t(`你在 2F 茶水間的沙發上醒來。阿桂姨幫你蓋了一條毯子。（損失 💰 ${lost}、⚡ 3 點精力）`),
  );
  const next: MudState = {
    ...s,
    phase: 'explore',
    combat: null,
    skillCd: 0,
    room: 'pantry',
    hp: Math.ceil(s.maxHp / 2),
    gold: s.gold - lost,
    energy: Math.max(0, s.energy - 3),
  };
  return addNews(next, now, `在 ${ROOMS[s.room].floor} 被「${e.name}」擊倒`);
}

function consumeItem(s: MudState, item: ItemId, out: Block[]): MudState | null {
  if ((s.bag[item] ?? 0) <= 0) {
    out.push(t(`你沒有${ITEMS[item].name}了。`));
    return null;
  }
  const base = Math.round((ITEMS[item].heal ?? 0) * (perk(s, 5) === 1 ? 1.5 : 1));
  const heal = Math.min(base, s.maxHp - s.hp);
  const verb = item === 'bento' ? '吃了' : '喝了';
  out.push(t(heal > 0 ? `你${verb}${ITEMS[item].name}，HP +${heal}。` : `你${verb}${ITEMS[item].name}。HP 本來就是滿的，但心情好多了。`));
  return { ...s, hp: s.hp + heal, bag: { ...s.bag, [item]: (s.bag[item] ?? 0) - 1 } };
}

function reply(s: MudState, env: Env, blocks: Block[], extra: Block[] = []): StepResult<MudState> {
  const replies: Reply[] = [[...blocks, ...extra, ...(s.cls ? [statusLine(s, env.now)] : [])]];
  return { state: s, replies, suggestions: suggestions(s, env) };
}

function enterRoom(s: MudState, room: RoomId): MudState {
  return { ...s, room };
}

/** 二周目：保留結局與周目數，其他從頭開始 */
export function newGamePlus(s: MudState, now: Date): MudState {
  const keep: Record<string, number> = { ng: (s.flags.ng ?? 0) + 1 };
  for (const k of Object.keys(ENDINGS)) if (s.flags[`end_${k}`]) keep[`end_${k}`] = 1;
  const fresh = newCharacter(`ng-${now.getTime()}`, now);
  return { ...fresh, gold: 200, flags: keep, news: s.news };
}

const envOf = (ctx: StepContext): Env => ({ now: ctx.now, preview: !!ctx.preview });

export const mudGame: MoyuGame<MudState> = {
  id: 'mo-mud',
  modelName: 'mo-mud-b13',
  description: '★ 主線 · B13 之龍：文字 MUD 冒險',
  available: true,

  seedFor() {
    return 'main';
  },

  init(_seed, ctx) {
    const s = newCharacter(`mud-${ctx.now.getTime()}`, ctx.now);
    return {
      state: s,
      replies: [
        [
          { kind: 'heading', text: 'B13 之龍 · 第一章《入職》' },
          t('雲頂大樓的電梯有一顆從來沒人按亮過的按鈕：B13。'),
          t('老員工說，那是機房，裡面睡著一條龍，叫做「季末」。牠每到季末就會醒來，吃掉員工的週末。被吃掉週末的人，會慢慢變成辦公室裡的怪物。'),
          t('今天是你到職的第一天。', 'muted'),
        ],
        [
          t('先登記一下你的職業吧：'),
          {
            kind: 'table',
            headers: ['職業', 'HP', '攻擊', '防禦', '技能'],
            align: ['left', 'right', 'right', 'right', 'left'],
            rows: (Object.keys(CLASSES) as ClassId[]).map((id) => {
              const c = CLASSES[id];
              return [c.name, String(c.hp), String(c.atk), String(c.def), `${c.skill}：${c.skillDesc}`];
            }),
          },
          t('每天有 20 點精力，巡邏一次扣 1 點。補血、逛商店、看公告欄都不用精力。指令也可以打英文：look、stat、go 3、attack。', 'muted'),
        ],
      ],
      suggestions: suggestions(s, envOf(ctx)),
    };
  },

  validate(text, state) {
    if (parseCommand(text, state)) return null;
    if (state.phase === 'create') return '請先選一個職業：工程師、業務或設計師。';
    if (state.phase === 'combat') return '戰鬥中只能攻擊、用技能、喝咖啡或逃跑。';
    if (state.phase === 'finale') return '請從下面的選項中選一個。';
    return '這裡看不懂這個指令。用下面的按鈕，或試試 look、stat、go 3。';
  },

  step(prev, input, ctx: StepContext) {
    const env = envOf(ctx);
    if (input.type !== 'text') return { state: prev, replies: [], suggestions: suggestions(prev, env) };
    const now = ctx.now;
    const cmd = parseCommand(input.text, prev);
    if (!cmd) return { state: prev, replies: [], suggestions: suggestions(prev, env) };

    const refreshed = refreshEnergy(prev, now);
    let s = refreshed.state;
    const out: Block[] = [];
    if (refreshed.refreshed) out.push(t('☀ 新的一天，精力回滿了。', 'muted'));
    const rng = new Rng(s.rng);
    const done = (next: MudState, extra: Block[] = []) => reply({ ...next, rng: rng.state }, env, out, extra);

    // 建立角色
    if (cmd.type === 'class') {
      const c = CLASSES[cmd.cls];
      s = { ...s, phase: 'explore', cls: cmd.cls, hp: c.hp, maxHp: c.hp, baseAtk: c.atk, baseDef: c.def };
      s = addNews(s, now, `以${c.name}的身分到職${s.flags.ng ? `（第 ${s.flags.ng + 1} 周目）` : ''}`);
      out.push(t(`你在人資系統上勾選了「${c.name}」。${c.desc}`), t('保全大叔把員工證遞給你：「歡迎。電梯那顆 B13 不要亂按。」'));
      if (s.flags.ng) out.push(t(`第 ${s.flags.ng + 1} 周目：怪物變強 ${s.flags.ng * 15}%，經驗與金錢也增加 ${s.flags.ng * 15}%。你帶著 💰 200 重新開始。`, 'muted'));
      return done(s, [roomBlock(s, env)]);
    }

    // 選擇結局
    if (cmd.type === 'ending') {
      const ending = ENDINGS[cmd.key];
      s = { ...s, phase: 'explore', flags: { ...s.flags, cleared: 1, [`end_${cmd.key}`]: 1 } };
      s = addNews(s, now, `迎來了「${ending.title}」`);
      const count = (Object.keys(ENDINGS) as EndingKey[]).filter((k) => s.flags[`end_${k}`]).length;
      const card = [
        `mo-mud-b13 · ${CLASSES[s.cls!].name} Lv${s.level}${s.flags.ng ? ` · ${s.flags.ng + 1} 周目` : ''}`,
        `${ending.title}`,
        `結局收集 ${count}/${Object.keys(ENDINGS).length}`,
      ].join('\n');
      return done(s, [
        { kind: 'heading', text: ending.title },
        ...ending.text.map((x) => t(x)),
        { kind: 'code', lang: 'credits', text: CREDITS.join('\n') },
        { kind: 'share', text: card },
        t(
          `🎉 恭喜通關！結局收集 ${count}/${Object.keys(ENDINGS).length}。${
            opened('ngplus', env) ? '回到 1F 大廳可以「轉職」開始二周目，用不同的選擇看看其他結局。' : `${releaseNote('ngplus')}，到時候可以轉職重來，看看其他結局。`
          }`,
          'muted',
        ),
      ]);
    }

    // 舊存檔補播章節開場
    if (s.phase === 'explore' && s.flags.boss1 && !s.flags.ch2intro) {
      out.push(...chapterTwoIntro());
      s = { ...s, flags: { ...s.flags, ch2intro: 1 } };
    }
    if (s.phase === 'explore' && s.flags.boss2 && !s.flags.ch3intro && opened('ch3', env)) {
      out.push(...chapterThreeIntro());
      s = { ...s, flags: { ...s.flags, ch3intro: 1 } };
    }

    // 戰鬥
    if (s.phase === 'combat' && s.combat) {
      const e = ENEMIES[s.combat.enemy];
      if (s.combat.skipNext) {
        // 這一回合被季末吃掉了
        out.push(t('你想行動，卻發現這段時間已經不見了。這一回合被季末吃掉了。', 'warn'));
        s = { ...s, combat: { ...s.combat, skipNext: false } };
        s = enemyTurn(s, rng, out);
      } else if (cmd.type === 'flee') {
        const chance = e.boss ? 0.3 : 0.6;
        if (rng.chance(chance)) {
          out.push(t('你說了一句「我先去處理一下別的事」，成功脫身。'));
          const room = BOSSES.find((b) => b.arena === s.room && b.enemy === e.id)?.room ?? s.room;
          s = { ...s, phase: 'explore', combat: null, skillCd: 0, room };
          return done(s, [roomBlock(s, env)]);
        }
        out.push(t('你想溜，但被叫住了：「欸，你先別走。」'));
        s = enemyTurn(s, rng, out);
      } else if (cmd.type === 'use') {
        const used = consumeItem(s, cmd.item, out);
        if (!used) return done(s, [combatBlock(s)]);
        s = enemyTurn(used, rng, out);
      } else {
        let dmg: number;
        const c = { ...s.combat };
        if (cmd.type === 'skill') {
          if (s.skillCd > 0) {
            out.push(t(`${CLASSES[s.cls!].skill}還在冷卻，再等 ${s.skillCd} 回合。`));
            return done(s, [combatBlock(s)]);
          }
          s = { ...s, skillCd: skillCooldown(s) + 1 };
          if (s.cls === 'engineer') {
            dmg = Math.round(damage(atkOf(s), e.def, rng) * 2.5);
            out.push(t(`你推了一個 Hotfix 上正式機！造成 ${dmg} 點傷害。`));
          } else if (s.cls === 'sales') {
            dmg = damage(atkOf(s), e.def, rng);
            c.stun = 2;
            c.talked = true;
            out.push(t(`你開始話術：「我完全理解您的顧慮，那我們換個角度想……」${e.name}愣住了。造成 ${dmg} 點傷害。`));
          } else {
            dmg = damage(atkOf(s), e.def, rng);
            c.dodge = true;
            out.push(t(`你說：「我再改一版。」造成 ${dmg} 點傷害，並準備好閃避下一次攻擊。`));
          }
        } else {
          dmg = damage(atkOf(s), e.def, rng);
          const crit = s.cls === 'designer' && rng.chance(0.15);
          if (crit) dmg = Math.round(dmg * 1.8);
          out.push(t(`你攻擊${e.name}，造成 ${dmg} 點傷害${crit ? '（爆擊！這一版客戶很滿意）' : ''}。`));
        }
        c.hp -= dmg;
        s = { ...s, combat: c };
        if (c.hp > 0) s = enemyTurn(s, rng, out);
      }
      if (s.combat && s.combat.hp <= 0) {
        s = winCombat(s, rng, out, env);
        const boss = BOSSES.find((b) => b.arena === s.room && b.arena !== b.room);
        if (boss) s = enterRoom(s, boss.room);
        return done(s, s.phase === 'finale' ? [] : [roomBlock(s, env)]);
      }
      if (s.hp <= 0) {
        s = loseCombat(s, out, now);
        return done(s, [roomBlock(s, env)]);
      }
      return done(s, [combatBlock(s)]);
    }

    if (s.phase !== 'explore') return done(s);

    // 探索
    switch (cmd.type) {
      case 'look':
        return done(s, [roomBlock(s, env)]);
      case 'status':
        return done(s, [sheetBlock(s)]);
      case 'use': {
        const used = consumeItem(s, cmd.item, out);
        return done(used ?? s);
      }
      case 'ngplus': {
        if (s.room !== 'lobby') {
          out.push(t('轉職要到 1F 大廳的人資櫃台辦理。'));
          return done(s);
        }
        if (!s.flags.cleared) {
          out.push(t('人資 Lisa-bot：「轉職需要先完成目前的職涯喔。」（打倒季末後開放）'));
          return done(s);
        }
        if (!opened('ngplus', env)) {
          out.push(t(`人資 Lisa-bot：「轉職制度還在規劃中。」（${releaseNote('ngplus')}）`));
          return done(s);
        }
        s = newGamePlus(s, now);
        out.push(
          { kind: 'heading', text: `第 ${(s.flags.ng ?? 0) + 1} 周目` },
          t('你在人資系統上按下「轉職」。一切重新開始，但你記得所有的事。'),
          t('季末好像也記得你。這一次，所有的怪物都更強了。', 'muted'),
          t('選一個職業吧：'),
        );
        return done(s);
      }
      case 'perk': {
        const tier = pendingPerkTier(s);
        if (!tier || cmd.perk.tier !== tier) {
          out.push(t(tier ? `現在要選的是 Lv${tier} 的天賦。` : '目前沒有可以選的天賦。'));
          return done(s);
        }
        s = { ...s, flags: { ...s.flags, [`perk${tier}`]: cmd.perk.choice } };
        if (tier === 5 && cmd.perk.choice === 2) s = { ...s, energy: s.energy + 5 };
        if (tier === 7 && cmd.perk.choice === 1) s = { ...s, maxHp: s.maxHp + 15, hp: s.hp + 15 };
        if (tier === 9 && cmd.perk.choice === 1) s = { ...s, baseAtk: s.baseAtk + 4 };
        out.push(t(`🌱 你學會了天賦「${cmd.perk.name}」：${cmd.perk.desc}。`, 'success'));
        s = addNews(s, now, `學會了天賦「${cmd.perk.name}」`);
        return done(s);
      }
      case 'elevator':
        s = enterRoom(s, 'elevator');
        out.push(t('叮。電梯門打開了。'));
        return done(s, [roomBlock(s, env)]);
      case 'floor': {
        const f = FLOORS[cmd.index];
        if (!floorOpen(f, s, env)) {
          const gated = f.release && !opened(f.release, env) && (!f.requires || s.flags[f.requires]);
          out.push(t(gated ? `${f.label.split(' ')[0]} 的按鈕貼著一張紙：「${releaseNote(f.release!)}」。` : f.locked!));
          return done(s.room === 'elevator' ? s : enterRoom(s, 'elevator'));
        }
        s = enterRoom(s, f.room!);
        out.push(t(`叮。${f.label}到了。`));
        return done(s, [roomBlock(s, env)]);
      }
      case 'news': {
        if (s.room !== 'lobby') {
          out.push(t('公告欄在 1F 大廳。'));
          return done(s);
        }
        const mine = s.news.length ? s.news.map((n) => `[${n.at}] 你${n.text}`) : ['（還沒有你的消息）'];
        const gossip = [rng.pick(GOSSIP), rng.pick(GOSSIP)].filter((v, i, a) => a.indexOf(v) === i);
        out.push(t('公告欄上貼滿了便條紙：'));
        return done(s, [{ kind: 'code', lang: 'news', text: [...mine, '', ...gossip].join('\n') }]);
      }
      case 'talk-guard': {
        if (s.room !== 'lobby') {
          out.push(t('保全大叔在 1F 大廳。'));
          return done(s);
        }
        const [lines, key] =
          s.flags.boss2 && opened('ch3', env) ? [GUARD_LINES_CH3, 'guard3'] : s.flags.boss1 ? [GUARD_LINES_CH2, 'guard2'] : [GUARD_LINES, 'guard'];
        const n = s.flags[key] ?? 0;
        out.push(t(lines[n % lines.length]));
        return done({ ...s, flags: { ...s.flags, [key]: n + 1 } });
      }
      case 'talk-auntie': {
        if (s.room !== 'pantry') {
          out.push(t('阿桂姨在 2F 茶水間。'));
          return done(s);
        }
        const q = s.flags.qThermos ?? 0;
        if (s.flags.boss1 && q === 0) {
          out.push(t(AUNTIE_QUEST.give), t('📌 任務開始：找回阿桂姨的保溫杯（9F 財務部）。', 'muted'));
          return done({ ...s, flags: { ...s.flags, qThermos: 1 } });
        }
        if (q === 1) {
          out.push(t(AUNTIE_QUEST.waiting));
          return done(s);
        }
        if (q === 2) {
          out.push(t(AUNTIE_QUEST.done), t('✓ 任務完成！獲得 ★阿桂姨的愛心便當 ×2、💰 100。', 'success'));
          s = { ...s, gold: s.gold + 100, bag: { ...s.bag, bento: (s.bag.bento ?? 0) + 2 }, flags: { ...s.flags, qThermos: 3 } };
          return done(addNews(s, now, '幫阿桂姨找回了保溫杯'));
        }
        const n = s.flags.auntie ?? 0;
        out.push(t(AUNTIE_LINES[n % AUNTIE_LINES.length]));
        return done({ ...s, flags: { ...s.flags, auntie: n + 1 } });
      }
      case 'talk-kpi': {
        if (s.room !== 'it') {
          out.push(t('KPI-9000 的終端機在 11F 資訊部。'));
          return done(s);
        }
        // 第二章 Boss 之後：臨時權限卡
        if (s.flags.boss2 && !s.flags.card) {
          if (!opened('ch3', env)) {
            out.push(t(KPI_CH3.locked));
            return done(s);
          }
          out.push(...KPI_CH3.card.map((l) => t(l)), t('🔓 取得臨時權限卡。電梯的 B1 停車場解鎖了。', 'success'));
          s = { ...s, flags: { ...s.flags, card: 1 } };
          return done(addNews(s, now, '從 KPI-9000 那裡拿到了臨時權限卡'));
        }
        const q = s.flags.qKpi ?? 0;
        if (q === 0) {
          out.push(...KPI_LINES.intro.map((l) => t(l)), t(`📌 任務開始：在 10F、11F 打倒 ${KPI_QUEST_KILLS} 個異常程序。`, 'muted'));
          return done({ ...s, flags: { ...s.flags, qKpi: 1, kpiKills: 0 } });
        }
        if (q === 1) {
          const kills = s.flags.kpiKills ?? 0;
          if (kills < KPI_QUEST_KILLS) {
            out.push(t(KPI_LINES.progress(kills)));
            return done(s);
          }
          out.push(...KPI_LINES.done.map((l) => t(l)), t('✓ 任務完成！', 'success'));
          s = receiveGear({ ...s, flags: { ...s.flags, qKpi: 2 } }, 'firewall', out);
          return done(addNews(s, now, '完成了 KPI-9000 的稽核任務'));
        }
        const n = s.flags.kpiTalk ?? 0;
        out.push(t(KPI_LINES.after[n % KPI_LINES.after.length]));
        return done({ ...s, flags: { ...s.flags, kpiTalk: n + 1 } });
      }
      case 'store':
        if (s.room !== 'lobby') {
          out.push(t('便利商店在 1F 大廳。'));
          return done(s);
        }
        s = enterRoom(s, 'store');
        return done(s, [
          roomBlock(s, env),
          {
            kind: 'table',
            headers: ['商品', '價格', '效果'],
            align: ['left', 'right', 'left'],
            rows: shopItems(s, env).map((id) => [itemLabel(id), String(ITEMS[id].price), ITEMS[id].desc]),
          },
        ]);
      case 'leave-store':
        s = enterRoom(s, 'lobby');
        return done(s, [roomBlock(s, env)]);
      case 'buy': {
        const item = ITEMS[cmd.item];
        if (s.room !== 'store') {
          out.push(t('要先到 1F 便利商店才能買東西。'));
          return done(s);
        }
        if (!shopItems(s, env).includes(cmd.item)) {
          out.push(t(`店員：「${item.name}還沒進貨喔。」`));
          return done(s);
        }
        if (s.gold < item.price) {
          out.push(t(`店員：「${item.name}要 ${item.price} 元喔。」你還差 ${item.price - s.gold} 元。`));
          return done(s);
        }
        s = { ...s, gold: s.gold - item.price };
        if (item.kind === 'consumable') {
          s = { ...s, bag: { ...s.bag, [cmd.item]: (s.bag[cmd.item] ?? 0) + 1 } };
          out.push(t(`你買了一份${item.name}，放進包包。`));
        } else if (item.kind === 'weapon') {
          s = { ...s, weapon: cmd.item };
          out.push(t(`你買了${itemLabel(cmd.item)}並裝備上。攻擊力變成 ${atkOf(s)}。`));
        } else {
          s = { ...s, armor: cmd.item };
          out.push(t(`你換上了${itemLabel(cmd.item)}。防禦力變成 ${defOf(s)}。`));
        }
        return done(s);
      }
      case 'rest': {
        if (s.room !== 'pantry') {
          out.push(t('這裡沒地方躺。去 2F 茶水間吧。'));
          return done(s);
        }
        if (s.hp >= s.maxHp) {
          out.push(t('你不累。阿桂姨說：「年輕人就是不一樣。」'));
          return done(s);
        }
        if (s.energy <= 0) {
          out.push(t('今天的精力用完了。你在沙發上坐了一下，但沒睡著。明天再來吧。'));
          return done(s);
        }
        s = { ...s, hp: s.maxHp, energy: s.energy - 1 };
        out.push(t('你在沙發上睡了二十分鐘。醒來時身上多了一條毯子。HP 回滿了。'));
        return done(s);
      }
      case 'boss': {
        const boss = BOSSES.find((b) => b.room === s.room);
        if (!boss) {
          out.push(t('這裡沒有什麼好挑戰的。'));
          return done(s);
        }
        if (s.flags[boss.flag]) {
          out.push(t(boss.cleared));
          return done(s);
        }
        if (s.level < boss.minLevel) {
          out.push(t(boss.tooLow.replace('{min}', String(boss.minLevel)).replace('{lv}', String(s.level))));
          return done(s);
        }
        if (s.energy <= 0) {
          out.push(t('今天的精力用完了。明天再來吧。'));
          return done(s);
        }
        s = { ...s, energy: s.energy - 1, room: boss.arena };
        out.push(t(ENEMIES[boss.enemy].intro, 'warn'));
        s = startCombat(s, boss.enemy);
        return done(s, [combatBlock(s)]);
      }
      case 'patrol': {
        const room = ROOMS[s.room];
        if (!room.enemies) {
          out.push(t(s.room === 'exec' ? '紅地毯上很安靜，只有董事長室的門縫透著光。' : s.room === 'b13' ? '你不敢亂走。黑暗裡有東西在呼吸。' : '這裡很和平，沒什麼好巡的。'));
          return done(s);
        }
        if (s.energy <= 0) {
          out.push(t('今天的精力用完了。茶水間、商店、公告欄還是可以逛，或者明天再來。'));
          return done(s);
        }
        s = { ...s, energy: s.energy - 1 };
        // 阿桂姨的保溫杯
        if (s.room === 'fin' && s.flags.qThermos === 1 && rng.chance(0.35)) {
          out.push(t(AUNTIE_QUEST.found, 'success'), t('📌 把保溫杯拿回 2F 茶水間給阿桂姨吧。', 'muted'));
          return done({ ...s, flags: { ...s.flags, qThermos: 2 } });
        }
        if (rng.chance(perk(s, 9) === 2 ? 0.35 : 0.25)) {
          const ev = rng.pick(PATROL_EVENTS);
          const boost = CH3_ROOMS.includes(s.room) ? 6 : s.flags.boss1 ? 3 : 1;
          out.push(t(ev.text));
          if (ev.gold) s = { ...s, gold: s.gold + ev.gold * boost };
          if (ev.heal) s = { ...s, hp: Math.min(s.maxHp, s.hp + ev.heal * boost) };
          if (ev.item) s = { ...s, bag: { ...s.bag, [ev.item]: (s.bag[ev.item] ?? 0) + 1 } };
          if (ev.exp) s = gainExp(s, ev.exp * (boost + 1), out, now);
          return done(s);
        }
        const night = isNight(now) && room.nightEnemies?.length && rng.chance(0.3);
        const enemy = night ? rng.pick(room.nightEnemies!) : rng.pick(room.enemies);
        out.push(t(ENEMIES[enemy].intro, 'warn'));
        s = startCombat(s, enemy);
        return done(s, [combatBlock(s)]);
      }
      default:
        return done(s);
    }
  },
};

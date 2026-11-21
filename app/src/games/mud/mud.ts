// 主力遊戲 · 《B13 之龍》mo-mud-b13 · 第一章「入職」
// 文字 MUD：在雲頂大樓裡移動、巡邏、戰鬥、升級，最終目標是 B13 的龍「季末」。
// 一則訊息 = 一個動作；戰鬥中關掉也會停在原處。每天 20 點精力，用完就明天再來。

import { taipeiDateString, taipeiDayIndex } from '../../engine/date';
import { Rng } from '../../engine/rng';
import type { Block, MoyuGame, Reply, StepContext, StepResult } from '../../engine/types';
import {
  AUNTIE_LINES,
  BOSS_MIN_LEVEL,
  CLASSES,
  ENEMIES,
  FLOORS,
  GOSSIP,
  GUARD_LINES,
  ITEMS,
  MAX_ENERGY,
  PATROL_EVENTS,
  ROOMS,
  SHOP_ITEMS,
  SKILL_COOLDOWN,
  type ClassId,
  type EnemyId,
  type ItemId,
  type RoomId,
} from './data';

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
}

export interface NewsItem {
  at: string;
  text: string;
}

export interface MudState {
  phase: 'create' | 'explore' | 'combat';
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
export const defOf = (s: MudState) => s.baseDef + (s.armor ? (ITEMS[s.armor].def ?? 0) : 0);

export function damage(atk: number, def: number, rng: Rng): number {
  return Math.max(1, atk + rng.int(3) - def);
}

/** 換日時回滿精力 */
export function refreshEnergy(s: MudState, now: Date): { state: MudState; refreshed: boolean } {
  const today = taipeiDayIndex(now);
  if (s.energyDay === today) return { state: s, refreshed: false };
  return { state: { ...s, energy: MAX_ENERGY, energyDay: today }, refreshed: s.energyDay !== -1 };
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

function statusLine(s: MudState): Block {
  if (!s.cls) return { kind: 'text', tone: 'muted', text: '' };
  return {
    kind: 'text',
    tone: 'muted',
    text: `Lv${s.level} ${CLASSES[s.cls].name} · HP ${s.hp}/${s.maxHp} · 攻 ${atkOf(s)} 防 ${defOf(s)} · 💰 ${s.gold} · ⚡ ${s.energy}/${MAX_ENERGY} · EXP ${s.exp}/${expToNext(s.level)}`,
  };
}

function roomBlock(s: MudState): Block {
  const r = ROOMS[s.room];
  const exits = s.room === 'store' ? '出口：大廳' : s.room === 'elevator' ? '出口：選擇樓層' : '出口：電梯';
  const lines = [`【${r.title}】`, ...r.desc, exits];
  if (r.enemies) lines.push(`這一層的出沒：${r.enemies.map((e) => ENEMIES[e].name).join('、')}`);
  return { kind: 'code', lang: 'room', text: lines.join('\n') };
}

function sheetBlock(s: MudState): Block {
  const c = CLASSES[s.cls!];
  const w = s.weapon ? ITEMS[s.weapon].name : '（空手）';
  const a = s.armor ? ITEMS[s.armor].name : '（襯衫）';
  const pad = (t: string, n: number) => t + ' '.repeat(Math.max(1, n - [...t].reduce((x, ch) => x + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)));
  const rows = [
    `${pad('職業  ' + c.name, 22)}等級  ${s.level}`,
    `${pad(`HP    ${s.hp}/${s.maxHp}`, 22)}EXP   ${s.exp}/${expToNext(s.level)}`,
    `${pad(`攻擊  ${atkOf(s)}`, 22)}防禦  ${defOf(s)}`,
    `${pad('武器  ' + w, 22)}防具  ${a}`,
    `${pad(`金錢  ${s.gold}`, 22)}精力  ${s.energy}/${MAX_ENERGY}`,
    `${pad(`技能  ${c.skill}`, 22)}碎片  ${s.fragments}/3`,
  ];
  return { kind: 'code', lang: 'character', text: rows.join('\n') };
}

function combatBlock(s: MudState): Block {
  const c = s.combat!;
  const e = ENEMIES[c.enemy];
  const bar = (v: number, max: number) => {
    const n = Math.min(12, Math.max(0, Math.round((v / max) * 12)));
    return '█'.repeat(n) + '░'.repeat(12 - n);
  };
  return {
    kind: 'code',
    lang: 'battle',
    text: [
      `${e.name}`,
      `HP ${bar(c.hp, e.hp)} ${Math.max(0, c.hp)}/${e.hp}${c.stun > 0 ? '  (愣住)' : ''}`,
      '',
      `你（${CLASSES[s.cls!].name}）`,
      `HP ${bar(s.hp, s.maxHp)} ${s.hp}/${s.maxHp}`,
      `回合 ${c.turn}  技能 ${s.skillCd > 0 ? `冷卻 ${s.skillCd}` : '可用'}`,
    ].join('\n'),
  };
}

const t = (text: string, tone?: 'muted' | 'success' | 'warn'): Block => ({ kind: 'text', text, ...(tone ? { tone } : {}) });

function consumableButtons(s: MudState): string[] {
  const out: string[] = [];
  if ((s.bag.coffee ?? 0) > 0) out.push(`☕ 喝美式咖啡（${s.bag.coffee}）`);
  if ((s.bag.boba ?? 0) > 0) out.push(`🧋 喝珍奶（${s.bag.boba}）`);
  return out;
}

export function suggestions(s: MudState): string[] {
  if (s.phase === 'create') return ['💻 工程師', '📞 業務', '🎨 設計師'];
  if (s.phase === 'combat') {
    const c = CLASSES[s.cls!];
    return ['⚔️ 攻擊', s.skillCd > 0 ? `✨ ${c.skill}（冷卻 ${s.skillCd}）` : `✨ ${c.skill}`, ...consumableButtons(s), '🏃 逃跑'];
  }
  const hurt = s.hp < s.maxHp ? consumableButtons(s) : [];
  switch (s.room) {
    case 'lobby':
      return ['📰 公告欄', '💬 跟保全大叔聊天', '🏪 便利商店', '🛗 搭電梯', '📋 狀態'];
    case 'store':
      return [...SHOP_ITEMS.map((id) => `買 ${ITEMS[id].name}（${ITEMS[id].price}）`), '🚪 回大廳'];
    case 'pantry':
      return ['😴 休息（1 精力）', '💬 跟阿桂姨聊天', ...hurt, '🛗 搭電梯', '📋 狀態'];
    case 'elevator':
      return FLOORS.map((f) => f.label);
    case 'meeting':
      return ['⚔️ 巡邏', '🚪 進入大會議室', ...hurt, '🛗 搭電梯', '📋 狀態'];
    default:
      return ['⚔️ 巡邏', ...hurt, '🛗 搭電梯', '👀 看看四周', '📋 狀態'];
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
  if (s.phase === 'create') {
    if (text.includes('工程師') || low === 'engineer') return { type: 'class', cls: 'engineer' };
    if (text.includes('業務') || low === 'sales') return { type: 'class', cls: 'sales' };
    if (text.includes('設計師') || low === 'designer') return { type: 'class', cls: 'designer' };
    return null;
  }
  if (text.includes('咖啡') && !text.startsWith('買')) return { type: 'use', item: 'coffee' };
  if (text.includes('珍奶') && !text.startsWith('買')) return { type: 'use', item: 'boba' };
  if (s.phase === 'combat') {
    if (text.includes('攻擊') || low === 'attack' || low === 'a') return { type: 'attack' };
    if (text.includes(CLASSES[s.cls!].skill) || text.includes('技能') || low === 'skill') return { type: 'skill' };
    if (text.includes('逃') || low === 'flee') return { type: 'flee' };
    return null;
  }
  if (text.startsWith('買')) {
    const item = SHOP_ITEMS.find((id) => text.includes(ITEMS[id].name));
    return item ? { type: 'buy', item } : null;
  }
  const floor = FLOORS.findIndex((f) => {
    const key = f.label.split(' ')[0];
    return text === f.label || text.toUpperCase() === key || text.startsWith(key + ' ');
  });
  if (s.room === 'elevator' && floor >= 0) return { type: 'floor', index: floor };
  if (/^go\s+(b13|\d+f?)$/i.test(low)) {
    const target = low.replace(/^go\s+/, '').toUpperCase().replace(/^(\d+)$/, '$1F');
    const i = FLOORS.findIndex((f) => f.label.startsWith(target));
    if (i >= 0) return { type: 'floor', index: i };
  }
  if (text.includes('巡邏') || low === 'patrol' || low === 'hunt') return { type: 'patrol' };
  if (text.includes('電梯') || low === 'elevator') return { type: 'elevator' };
  if (text.includes('看看四周') || low === 'look' || low === 'l') return { type: 'look' };
  if (text.includes('狀態') || low === 'stat' || low === 'status') return { type: 'status' };
  if (text.includes('公告欄') || low === 'news') return { type: 'news' };
  if (text.includes('保全')) return { type: 'talk-guard' };
  if (text.includes('阿桂姨')) return { type: 'talk-auntie' };
  if (text.includes('便利商店') || low === 'shop') return { type: 'store' };
  if (text.includes('回大廳')) return { type: 'leave-store' };
  if (text.includes('休息') || low === 'rest') return { type: 'rest' };
  if (text.includes('大會議室')) return { type: 'boss' };
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
  }
  return next;
}

function startCombat(s: MudState, enemy: EnemyId): MudState {
  const e = ENEMIES[enemy];
  return { ...s, phase: 'combat', combat: { enemy, hp: e.hp, atk: e.atk, turn: 1, stun: 0, dodge: false, talked: false } };
}

function enemyTurn(s: MudState, rng: Rng, out: Block[]): MudState {
  const c = { ...s.combat! };
  const e = ENEMIES[c.enemy];
  let next = s;
  if (e.boss && c.turn % 3 === 0) {
    const heal = Math.min(10, e.hp - c.hp);
    c.hp += heal;
    c.atk += 1;
    out.push(t(`⏰ 週會宣布「再延長 10 分鐘」！它回復了 ${heal} HP，攻擊力變成 ${c.atk}。`, 'warn'));
  }
  if (c.stun > 0) {
    c.stun -= 1;
    out.push(t(`${e.name}還愣在那裡，不知道該說什麼。`, 'muted'));
  } else if (c.dodge) {
    c.dodge = false;
    const counter = damage(atkOf(s), e.def, rng);
    c.hp -= counter;
    out.push(t(`${e.name}出手了，但你早就改好稿了。你閃開並反擊，造成 ${counter} 點傷害。`));
  } else {
    const dmg = damage(c.atk, defOf(s), rng);
    next = { ...next, hp: Math.max(0, next.hp - dmg) };
    out.push(t(`${rng.pick(e.attacks)}你受到 ${dmg} 點傷害。`));
  }
  c.turn += 1;
  return { ...next, combat: c, skillCd: Math.max(0, next.skillCd - 1) };
}

function winCombat(s: MudState, out: Block[], now: Date): MudState {
  const c = s.combat!;
  const e = ENEMIES[c.enemy];
  const gold = Math.round(e.gold * (c.talked ? 1.5 : 1));
  out.push(t(e.defeat), t(`✓ 打倒了${e.name}！獲得 ${e.exp} EXP、💰 ${gold}${c.talked ? '（話術加成）' : ''}。`, 'success'));
  let next: MudState = { ...s, phase: 'explore', combat: null, skillCd: 0, gold: s.gold + gold };
  next = addNews(next, now, `打倒了「${e.name}」`);
  next = gainExp(next, e.exp, out, now);
  if (e.boss && !next.flags.boss1) {
    next = { ...next, fragments: next.fragments + 1, flags: { ...next.flags, boss1: 1 } };
    next = addNews(next, now, '終結了無限延長的週會，取得權限卡碎片');
    out.push(
      t('白板背面貼著一張卡片，上面印著「B13 · 1/3」。你取得了第一片權限卡碎片！', 'success'),
      t('稱號解鎖：「會議終結者」。電梯的 8F 按鈕好像亮了一下。', 'muted'),
      t('🎉 第一章《入職》完成。第二章《加班》正在施工中，你可以繼續在 1F~7F 練功。'),
    );
  }
  return next;
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
  const heal = Math.min(ITEMS[item].heal ?? 0, s.maxHp - s.hp);
  out.push(t(heal > 0 ? `你喝了一杯${ITEMS[item].name}，HP +${heal}。` : `你喝了一杯${ITEMS[item].name}。HP 本來就是滿的，但心情好多了。`));
  return { ...s, hp: s.hp + heal, bag: { ...s.bag, [item]: (s.bag[item] ?? 0) - 1 } };
}

function reply(s: MudState, blocks: Block[], extra: Block[] = []): StepResult<MudState> {
  const replies: Reply[] = [[...blocks, ...extra, ...(s.cls ? [statusLine(s)] : [])]];
  return { state: s, replies, suggestions: suggestions(s) };
}

function enterRoom(s: MudState, room: RoomId): MudState {
  return { ...s, room };
}

export const mudGame: MoyuGame<MudState> = {
  id: 'mo-mud',
  modelName: 'mo-mud-b13',
  description: '★ 主線 · B13 之龍：文字 MUD 冒險（第一章 入職）',
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
      suggestions: suggestions(s),
    };
  },

  validate(text, state) {
    if (parseCommand(text, state)) return null;
    if (state.phase === 'create') return '請先選一個職業：工程師、業務或設計師。';
    if (state.phase === 'combat') return '戰鬥中只能攻擊、用技能、喝咖啡或逃跑。';
    return '這裡看不懂這個指令。用下面的按鈕，或試試 look、stat、go 3。';
  },

  step(prev, input, ctx: StepContext) {
    if (input.type !== 'text') return { state: prev, replies: [], suggestions: suggestions(prev) };
    const now = ctx.now;
    const cmd = parseCommand(input.text, prev);
    if (!cmd) return { state: prev, replies: [], suggestions: suggestions(prev) };

    const refreshed = refreshEnergy(prev, now);
    let s = refreshed.state;
    const out: Block[] = [];
    if (refreshed.refreshed) out.push(t('☀ 新的一天，精力回滿了。', 'muted'));
    const rng = new Rng(s.rng);
    const done = (next: MudState, extra: Block[] = []) => reply({ ...next, rng: rng.state }, out, extra);

    // 建立角色
    if (cmd.type === 'class') {
      const c = CLASSES[cmd.cls];
      s = { ...s, phase: 'explore', cls: cmd.cls, hp: c.hp, maxHp: c.hp, baseAtk: c.atk, baseDef: c.def };
      s = addNews(s, now, `以${c.name}的身分到職`);
      out.push(t(`你在人資系統上勾選了「${c.name}」。${c.desc}`), t('保全大叔把員工證遞給你：「歡迎。電梯那顆 B13 不要亂按。」'));
      return done(s, [roomBlock(s)]);
    }

    // 戰鬥
    if (s.phase === 'combat' && s.combat) {
      const e = ENEMIES[s.combat.enemy];
      if (cmd.type === 'flee') {
        const chance = e.boss ? 0.3 : 0.6;
        if (rng.chance(chance)) {
          out.push(t('你說了一句「我先去處理一下別的事」，成功脫身。'));
          return done({ ...s, phase: 'explore', combat: null, skillCd: 0 }, [roomBlock(s)]);
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
          s = { ...s, skillCd: SKILL_COOLDOWN + 1 };
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
        s = winCombat(s, out, now);
        return done(s, [roomBlock(s)]);
      }
      if (s.hp <= 0) {
        s = loseCombat(s, out, now);
        return done(s, [roomBlock(s)]);
      }
      return done(s, [combatBlock(s)]);
    }

    // 探索
    switch (cmd.type) {
      case 'look':
        return done(s, [roomBlock(s)]);
      case 'status':
        return done(s, [sheetBlock(s)]);
      case 'use': {
        const used = consumeItem(s, cmd.item, out);
        return done(used ?? s);
      }
      case 'elevator':
        s = enterRoom(s, 'elevator');
        out.push(t('叮。電梯門打開了。'));
        return done(s, [roomBlock(s)]);
      case 'floor': {
        const f = FLOORS[cmd.index];
        if (!f.room) {
          out.push(t(f.locked!));
          return done(s.room === 'elevator' ? s : enterRoom(s, 'elevator'));
        }
        s = enterRoom(s, f.room);
        out.push(t(`叮。${f.label}到了。`));
        return done(s, [roomBlock(s)]);
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
        const n = s.flags.guard ?? 0;
        out.push(t(GUARD_LINES[n % GUARD_LINES.length]));
        return done({ ...s, flags: { ...s.flags, guard: n + 1 } });
      }
      case 'talk-auntie': {
        if (s.room !== 'pantry') {
          out.push(t('阿桂姨在 2F 茶水間。'));
          return done(s);
        }
        const n = s.flags.auntie ?? 0;
        out.push(t(AUNTIE_LINES[n % AUNTIE_LINES.length]));
        return done({ ...s, flags: { ...s.flags, auntie: n + 1 } });
      }
      case 'store':
        if (s.room !== 'lobby') {
          out.push(t('便利商店在 1F 大廳。'));
          return done(s);
        }
        s = enterRoom(s, 'store');
        return done(s, [
          roomBlock(s),
          {
            kind: 'table',
            headers: ['商品', '價格', '效果'],
            align: ['left', 'right', 'left'],
            rows: SHOP_ITEMS.map((id) => [ITEMS[id].name, String(ITEMS[id].price), ITEMS[id].desc]),
          },
        ]);
      case 'leave-store':
        s = enterRoom(s, 'lobby');
        return done(s, [roomBlock(s)]);
      case 'buy': {
        const item = ITEMS[cmd.item];
        if (s.room !== 'store') {
          out.push(t('要先到 1F 便利商店才能買東西。'));
          return done(s);
        }
        if (s.gold < item.price) {
          out.push(t(`店員：「${item.name}要 ${item.price} 元喔。」你還差 ${item.price - s.gold} 元。`));
          return done(s);
        }
        s = { ...s, gold: s.gold - item.price };
        if (item.kind === 'consumable') {
          s = { ...s, bag: { ...s.bag, [cmd.item]: (s.bag[cmd.item] ?? 0) + 1 } };
          out.push(t(`你買了一杯${item.name}，放進包包。`));
        } else if (item.kind === 'weapon') {
          s = { ...s, weapon: cmd.item };
          out.push(t(`你買了${item.name}並裝備上。攻擊力變成 ${atkOf(s)}。`));
        } else {
          s = { ...s, armor: cmd.item };
          out.push(t(`你換上了${item.name}。防禦力變成 ${defOf(s)}。`));
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
        if (s.room !== 'meeting') {
          out.push(t('大會議室在 7 樓。'));
          return done(s);
        }
        if (s.flags.boss1) {
          out.push(t('大會議室空蕩蕩的。白板上還留著一行字：「本次會議提早結束」。'));
          return done(s);
        }
        if (s.level < BOSS_MIN_LEVEL) {
          out.push(t(`門口的白板寫著：「與會資格：Lv${BOSS_MIN_LEVEL} 以上」。你現在 Lv${s.level}，再去練練吧。`));
          return done(s);
        }
        if (s.energy <= 0) {
          out.push(t('今天的精力用完了。這場會議明天再開吧。'));
          return done(s);
        }
        s = { ...s, energy: s.energy - 1, room: 'boss-room' };
        out.push(t(ENEMIES['weekly-meeting'].intro, 'warn'));
        s = startCombat(s, 'weekly-meeting');
        return done(s, [combatBlock(s)]);
      }
      case 'patrol': {
        const room = ROOMS[s.room];
        if (!room.enemies) {
          out.push(t('這裡很和平，沒什麼好巡的。'));
          return done(s);
        }
        if (s.energy <= 0) {
          out.push(t('今天的精力用完了。茶水間、商店、公告欄還是可以逛，或者明天再來。'));
          return done(s);
        }
        s = { ...s, energy: s.energy - 1 };
        if (rng.chance(0.25)) {
          const ev = rng.pick(PATROL_EVENTS);
          out.push(t(ev.text));
          if (ev.gold) s = { ...s, gold: s.gold + ev.gold };
          if (ev.heal) s = { ...s, hp: Math.min(s.maxHp, s.hp + ev.heal) };
          if (ev.item) s = { ...s, bag: { ...s.bag, [ev.item]: (s.bag[ev.item] ?? 0) + 1 } };
          if (ev.exp) s = gainExp(s, ev.exp, out, now);
          return done(s);
        }
        const enemy = rng.pick(room.enemies);
        out.push(t(ENEMIES[enemy].intro, 'warn'));
        s = startCombat(s, enemy);
        return done(s, [combatBlock(s)]);
      }
      default:
        return done(s);
    }
  },
};

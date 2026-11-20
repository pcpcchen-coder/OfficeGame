// G3 · Bug 地城 mo-rogue-mini
// 長得像程式碼區塊的 ASCII 地城。一則訊息 = 一回合，每一步都自動存檔。
// 每日種子：同一天全服的地圖一模一樣（怪物的行動也一樣，只要你走法相同）。

import { taipeiDayIndex } from '../../engine/date';
import { Rng } from '../../engine/rng';
import type { Block, MoyuGame, Profile, Reply, StepResult } from '../../engine/types';

export const W = 15;
export const H = 9;
export const MAX_DEPTH = 10;
const VIEW_RADIUS = 3;

export type MonsterKind = 'N' | 'L' | 'S' | 'R' | 'D';
export type ItemKind = 'coffee' | 'duck';

export interface Monster {
  id: number;
  kind: MonsterKind;
  x: number;
  y: number;
  hp: number;
  atk: number;
}

export interface Item {
  kind: ItemKind;
  x: number;
  y: number;
}

export interface Floor {
  depth: number;
  /** 長度 W*H，'#' 牆、'.' 地板 */
  tiles: string;
  exit: [number, number];
  monsters: Monster[];
  items: Item[];
  /** 長度 W*H，'1' 表示看過 */
  seen: string;
}

export interface RogueCore {
  seed: string;
  mode: 'daily' | 'practice';
  dayIndex: number;
  floor: Floor;
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  atk: number;
  turns: number;
  floorTurns: number;
  kills: number;
  coffee: number;
  ducks: number;
  reverts: number;
  status: 'playing' | 'dead' | 'won';
  killedBy: MonsterKind | null;
  rng: number;
}

export interface RogueState extends RogueCore {
  /** 上一回合的快照，給 git revert 用 */
  prev: RogueCore | null;
}

export const MONSTERS: Record<MonsterKind, { name: string; hp: number; atk: number }> = {
  N: { name: 'NullPointer 史萊姆', hp: 3, atk: 1 },
  L: { name: '記憶體洩漏幽靈', hp: 4, atk: 1 },
  S: { name: '無限迴圈蛇', hp: 5, atk: 2 },
  R: { name: 'Race Condition 雙胞胎', hp: 3, atk: 1 },
  D: { name: '死線惡魔', hp: 12, atk: 2 },
};

const DEATH_LINES: Record<MonsterKind, string> = {
  N: '史萊姆：「undefined is not a function」。它倒下了，掉落了……什麼都沒有。（這很合理。）',
  L: '幽靈被垃圾回收了。你感覺記憶體輕了一點。',
  S: '無限迴圈蛇終於 break 了。',
  R: '雙胞胎之一倒下了。另一隻好像吸收了它的執行緒。',
  D: '死線惡魔被你延後了。它化成一封「時程調整通知」飄走了。',
};

// ---------- 小工具 ----------

const idx = (x: number, y: number) => y * W + x;
const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
const manhattan = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);
const chebyshev = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

function isWall(f: Floor, x: number, y: number): boolean {
  return !inBounds(x, y) || f.tiles[idx(x, y)] === '#';
}

/** 從 (sx,sy) 出發的步數，走不到為 -1 */
export function distances(tiles: string, sx: number, sy: number): number[] {
  const dist = new Array(W * H).fill(-1);
  const q: Array<[number, number]> = [[sx, sy]];
  dist[idx(sx, sy)] = 0;
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny) || tiles[idx(nx, ny)] === '#' || dist[idx(nx, ny)] !== -1) continue;
      dist[idx(nx, ny)] = dist[idx(x, y)] + 1;
      q.push([nx, ny]);
    }
  }
  return dist;
}

const DIRS: Array<[number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

function reveal(f: Floor, px: number, py: number, all = false): Floor {
  const seen = f.seen.split('');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (all || chebyshev(x, y, px, py) <= VIEW_RADIUS) seen[idx(x, y)] = '1';
    }
  }
  return { ...f, seen: seen.join('') };
}

// ---------- 地圖生成（只依種子與層數決定，全服相同） ----------

function monsterKindsFor(depth: number): MonsterKind[] {
  if (depth <= 2) return ['N'];
  if (depth <= 4) return ['N', 'L'];
  return ['N', 'L', 'S'];
}

export function generateFloor(seed: string, depth: number): { floor: Floor; start: [number, number] } {
  const rng = Rng.fromString(`${seed}:floor:${depth}`);
  for (let attempt = 0; ; attempt++) {
    const t: string[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
        t.push(border ? '#' : rng.chance(attempt < 20 ? 0.16 : 0.05) ? '#' : '.');
      }
    }
    const tiles = t.join('');
    const open: Array<[number, number]> = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (tiles[idx(x, y)] === '.') open.push([x, y]);
    const start = rng.pick(open);
    const dist = distances(tiles, start[0], start[1]);
    const far = open.filter(([x, y]) => dist[idx(x, y)] >= 9);
    if (far.length === 0) continue;
    const exit = rng.pick(far);
    const reachable = open.filter(([x, y]) => dist[idx(x, y)] >= 0);
    const taken = new Set<number>([idx(...start), idx(...exit)]);
    const freeCell = (minDist: number): [number, number] | null => {
      const cands = reachable.filter(([x, y]) => !taken.has(idx(x, y)) && dist[idx(x, y)] >= minDist);
      if (cands.length === 0) return null;
      const c = rng.pick(cands);
      taken.add(idx(...c));
      return c;
    };

    const monsters: Monster[] = [];
    let id = 1;
    const spawn = (kind: MonsterKind): boolean => {
      const c = freeCell(4);
      if (!c) return false;
      monsters.push({ id: id++, kind, x: c[0], y: c[1], hp: MONSTERS[kind].hp, atk: MONSTERS[kind].atk });
      return true;
    };
    if (depth === MAX_DEPTH) {
      spawn('D');
      spawn('N');
      spawn('L');
    } else {
      const count = Math.min(3, 1 + Math.floor(depth / 3));
      const kinds = monsterKindsFor(depth);
      for (let i = 0; i < count; i++) spawn(rng.pick(kinds));
      if (depth >= 7) {
        spawn('R');
        spawn('R');
      }
    }

    const items: Item[] = [];
    if (rng.chance(0.85)) {
      const c = freeCell(1);
      if (c) items.push({ kind: 'coffee', x: c[0], y: c[1] });
    }
    if (depth >= 2 && rng.chance(0.3)) {
      const c = freeCell(1);
      if (c) items.push({ kind: 'duck', x: c[0], y: c[1] });
    }

    const floor: Floor = { depth, tiles, exit, monsters, items, seen: '0'.repeat(W * H) };
    return { floor: reveal(floor, start[0], start[1]), start };
  }
}

// ---------- 畫面 ----------

const LEGEND: Record<string, string> = {
  '@': '你',
  N: MONSTERS.N.name,
  L: MONSTERS.L.name,
  S: MONSTERS.S.name,
  R: MONSTERS.R.name,
  D: MONSTERS.D.name,
  $: '咖啡',
  '%': '小黃鴨',
  '>': '下一層',
};

export function renderMap(s: RogueCore): string {
  const f = s.floor;
  const rows: string[] = [];
  const present = new Set<string>();
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      const visible = chebyshev(x, y, s.px, s.py) <= VIEW_RADIUS;
      let ch = f.seen[i] === '1' ? f.tiles[i] : ' ';
      if (f.seen[i] === '1') {
        if (f.exit[0] === x && f.exit[1] === y) ch = '>';
        const item = f.items.find((it) => it.x === x && it.y === y);
        if (item) ch = item.kind === 'coffee' ? '$' : '%';
      }
      const m = visible ? f.monsters.find((mm) => mm.x === x && mm.y === y) : undefined;
      if (m) ch = m.kind;
      if (s.px === x && s.py === y) ch = '@';
      if (LEGEND[ch]) present.add(ch);
      row += ch;
    }
    rows.push(row);
  }
  const legend = Object.keys(LEGEND)
    .filter((k) => present.has(k))
    .map((k) => `${k} ${LEGEND[k]}`);
  return rows.map((r, i) => (legend[i] ? `${r}   ${legend[i]}` : r).trimEnd()).join('\n');
}

function statusText(s: RogueCore): string {
  const parts = [`HP ${s.hp}/${s.maxHp}`, `第 ${s.floor.depth} 層`, `回合 ${s.turns}`, `攻擊 ${s.atk}`, `☕×${s.coffee}`, `🦆×${s.ducks}`, `revert×${s.reverts}`];
  return parts.join(' · ');
}

function view(s: RogueCore): Block[] {
  return [
    { kind: 'code', lang: `floor-${s.floor.depth}`, text: renderMap(s) },
    { kind: 'text', tone: 'muted', text: statusText(s) },
  ];
}

export function shareCard(s: RogueCore): string {
  const label = s.mode === 'daily' ? `#${s.dayIndex + 1}` : '練習';
  const result = s.status === 'won' ? '✓ 準時下班' : `☠ ${s.killedBy ? MONSTERS[s.killedBy].name : ''}`;
  const depthBar = '█'.repeat(s.floor.depth) + '░'.repeat(MAX_DEPTH - s.floor.depth);
  return [`mo-rogue-mini ${label}  B${s.floor.depth}F  T${s.turns}`, `depth ${depthBar}`, `kills=${s.kills}  ${result}`].join('\n');
}

// ---------- 指令 ----------

type Command =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'coffee' }
  | { type: 'duck' }
  | { type: 'revert' }
  | { type: 'look' }
  | { type: 'practice' };

const MOVE_WORDS: Record<string, [number, number]> = {
  '↑': [0, -1],
  上: [0, -1],
  w: [0, -1],
  '↓': [0, 1],
  下: [0, 1],
  s: [0, 1],
  '←': [-1, 0],
  左: [-1, 0],
  a: [-1, 0],
  '→': [1, 0],
  右: [1, 0],
  d: [1, 0],
};

export function parseCommand(text: string): Command | null {
  const t = text.trim().toLowerCase();
  if (MOVE_WORDS[t]) return { type: 'move', dx: MOVE_WORDS[t][0], dy: MOVE_WORDS[t][1] };
  if (t.includes('咖啡') || t === '/coffee') return { type: 'coffee' };
  if (t.includes('小黃鴨') || t === '/duck') return { type: 'duck' };
  if (t.includes('revert')) return { type: 'revert' };
  if (t.includes('地圖') || t === '/look' || t === 'look') return { type: 'look' };
  if (t.includes('練習') || t.includes('再來一局')) return { type: 'practice' };
  return null;
}

function suggestions(s: RogueState): string[] {
  if (s.status !== 'playing') return ['🔁 練習一局'];
  const list = ['↑', '↓', '←', '→'];
  if (s.coffee > 0) list.push('☕ 喝咖啡');
  if (s.ducks > 0) list.push('🦆 問小黃鴨');
  if (s.reverts > 0 && s.prev) list.push('↩ git revert');
  list.push('🔍 查看地圖');
  return list;
}

// ---------- 規則 ----------

function core(s: RogueState): RogueCore {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { prev, ...rest } = s;
  return rest;
}

export function newRun(seed: string, mode: 'daily' | 'practice', dayIndex: number): RogueState {
  const { floor, start } = generateFloor(seed, 1);
  return {
    seed,
    mode,
    dayIndex,
    floor,
    px: start[0],
    py: start[1],
    hp: 10,
    maxHp: 10,
    atk: 2,
    turns: 0,
    floorTurns: 0,
    kills: 0,
    coffee: 0,
    ducks: 0,
    reverts: 1,
    status: 'playing',
    killedBy: null,
    rng: Rng.fromString(`${seed}:ai`).state,
    prev: null,
  };
}

function monstersAct(s: RogueCore, rng: Rng, log: string[]): RogueCore {
  let { hp, maxHp, killedBy } = s;
  const monsters = s.floor.monsters.map((m) => ({ ...m }));
  const occupied = (x: number, y: number, self: number) => monsters.some((m) => m.id !== self && m.x === x && m.y === y);

  if (s.floor.depth === MAX_DEPTH && s.floorTurns > 0 && s.floorTurns % 5 === 0) {
    const boss = monsters.find((m) => m.kind === 'D');
    if (boss && boss.atk < 5) {
      boss.atk += 1;
      log.push(`死線又提前了！死線惡魔的攻擊力變成 ${boss.atk}。`);
    }
  }

  for (const m of monsters) {
    if (hp <= 0) break;
    const d = manhattan(m.x, m.y, s.px, s.py);
    if (d === 1) {
      hp -= m.atk;
      let line = `${MONSTERS[m.kind].name}攻擊你，-${m.atk} HP。`;
      if (m.kind === 'L' && maxHp > 4) {
        maxHp -= 1;
        hp = Math.min(hp, maxHp);
        line += '你的最大 HP -1（記憶體洩漏中）。';
      }
      log.push(line);
      if (hp <= 0) killedBy = m.kind;
      continue;
    }
    let steps: Array<[number, number]> = [];
    const chasing = chebyshev(m.x, m.y, s.px, s.py) <= 5 && !(m.kind === 'S' && rng.chance(0.5));
    if (chasing) {
      steps = [...DIRS].sort(
        (a, b) => manhattan(m.x + a[0], m.y + a[1], s.px, s.py) - manhattan(m.x + b[0], m.y + b[1], s.px, s.py),
      );
      steps = steps.filter(([dx, dy]) => manhattan(m.x + dx, m.y + dy, s.px, s.py) < d);
    } else if (rng.chance(0.4)) {
      steps = [rng.pick(DIRS)];
    }
    for (const [dx, dy] of steps) {
      const nx = m.x + dx;
      const ny = m.y + dy;
      if (isWall(s.floor, nx, ny) || occupied(nx, ny, m.id) || (nx === s.px && ny === s.py)) continue;
      m.x = nx;
      m.y = ny;
      break;
    }
  }
  return { ...s, hp: Math.max(0, hp), maxHp, killedBy, floor: { ...s.floor, monsters } };
}

function descend(s: RogueCore, log: string[]): RogueCore {
  const depth = s.floor.depth + 1;
  const { floor, start } = generateFloor(s.seed, depth);
  let { atk, hp } = s;
  let { maxHp } = s;
  const skill = depth === 4 || depth === 7;
  if (skill) {
    atk += 1;
    maxHp += 2;
  }
  const healed = Math.min(maxHp, hp + 3) - hp;
  hp += healed;
  log.push(`你走下樓梯，來到第 ${depth} 層。稍微喘口氣，HP +${healed}。`);
  if (skill) log.push('你學會了新的除錯技巧：攻擊力 +1、最大 HP +2。');
  if (depth === MAX_DEPTH) log.push('空氣突然變得很緊繃。這一層有死線惡魔，打倒它才能下班。');
  return { ...s, floor, px: start[0], py: start[1], atk, hp, maxHp, floorTurns: 0 };
}

function recordRun(profile: Profile, s: RogueCore): Profile {
  if (s.mode === 'daily' && profile.rogue.lastDailyDay === s.dayIndex) return profile;
  return {
    ...profile,
    rogue: {
      runs: profile.rogue.runs + 1,
      wins: profile.rogue.wins + (s.status === 'won' ? 1 : 0),
      bestDepth: Math.max(profile.rogue.bestDepth, s.floor.depth),
      lastDailyDay: s.mode === 'daily' ? s.dayIndex : profile.rogue.lastDailyDay,
    },
  };
}

function endBlocks(s: RogueCore, profile: Profile): Block[] {
  const r = profile.rogue;
  return [
    { kind: 'share', text: shareCard(s) },
    {
      kind: 'text',
      tone: 'muted',
      text: `${s.mode === 'daily' ? '今天的每日地城完成了。' : '練習結束。'}累計 ${r.runs} 局 · 通關 ${r.wins} 次 · 最深第 ${r.bestDepth} 層。明天會有新的每日地城；想再玩可以開一局練習。`,
    },
  ];
}

function result(state: RogueState, replies: Reply[], profile?: Profile): StepResult<RogueState> {
  return { state, replies, suggestions: suggestions(state), profile };
}

export const rogueGame: MoyuGame<RogueState> = {
  id: 'mo-rogue-mini',
  modelName: 'mo-rogue-mini',
  description: 'Bug 地城 · ASCII roguelite，每日種子 · 每層約 1 分鐘',
  available: true,

  seedFor(ctx) {
    return `daily-${taipeiDayIndex(ctx.now)}`;
  },

  init(seed, ctx) {
    const dayIndex = taipeiDayIndex(ctx.now);
    const done = ctx.profile.rogue.lastDailyDay === dayIndex;
    const state = newRun(done ? `practice-${ctx.now.getTime()}` : seed, done ? 'practice' : 'daily', dayIndex);
    return result(state, [
      [
        {
          kind: 'text',
          text: done
            ? '今天的每日地城你已經走過了，這一局是練習，不計成績。'
            : `今天的每日地城 #${dayIndex + 1}。全服同一張地圖，看誰走得最深。`,
        },
        { kind: 'text', tone: 'muted', text: '用 ↑↓←→（或 WASD）移動，撞到 bug 就是攻擊。走到 > 下樓，第 10 層打倒死線惡魔就能準時下班。' },
      ],
      view(state),
    ]);
  },

  validate(text, state) {
    if (parseCommand(text)) return null;
    return state.status === 'playing'
      ? 'Bug 地城只接受方向（↑↓←→ 或 WASD）和下面按鈕上的指令。'
      : '這一局結束了。點「練習一局」可以再玩。';
  },

  step(state, input, ctx) {
    if (input.type !== 'text') return result(state, []);
    const cmd = parseCommand(input.text);
    if (!cmd) return result(state, []);

    if (cmd.type === 'practice') {
      const next = newRun(`practice-${ctx.now.getTime()}`, 'practice', taipeiDayIndex(ctx.now));
      return result(next, [[{ kind: 'text', text: '新的練習地城，不計成績。祝你準時下班。' }, ...view(next)]]);
    }

    if (state.status !== 'playing') {
      return result(state, [[{ kind: 'text', text: '這一局結束了。點「練習一局」可以再玩。' }]]);
    }

    if (cmd.type === 'look') return result(state, [view(state)]);

    if (cmd.type === 'revert') {
      if (!state.prev || state.reverts <= 0) return result(state, [[{ kind: 'text', text: '沒有可以 revert 的 commit 了。' }]]);
      const restored: RogueState = { ...state.prev, reverts: state.reverts - 1, prev: null };
      return result(restored, [[{ kind: 'text', text: 'git revert 成功，時間倒回上一回合。' }, ...view(restored)]]);
    }

    const rng = new Rng(state.rng);
    const log: string[] = [];
    let s: RogueCore = core(state);
    const snapshot = core(state);

    if (cmd.type === 'coffee') {
      if (s.coffee <= 0) return result(state, [[{ kind: 'text', text: '你沒有咖啡了。' }]]);
      const heal = Math.min(4, s.maxHp - s.hp);
      s = { ...s, coffee: s.coffee - 1, hp: s.hp + heal };
      log.push(heal > 0 ? `你喝了一杯咖啡，HP +${heal}。` : '你喝了一杯咖啡。HP 本來就是滿的，但你覺得很爽。');
    } else if (cmd.type === 'duck') {
      if (s.ducks <= 0) return result(state, [[{ kind: 'text', text: '你沒有小黃鴨。' }]]);
      s = { ...s, ducks: s.ducks - 1, floor: reveal(s.floor, s.px, s.py, true) };
      log.push('你對小黃鴨解釋了一遍這層的結構。說著說著，整張地圖都清楚了。');
    } else if (cmd.type === 'move') {
      const nx = s.px + cmd.dx;
      const ny = s.py + cmd.dy;
      const target = s.floor.monsters.find((m) => m.x === nx && m.y === ny);
      if (target) {
        const crit = rng.chance(0.25);
        const dmg = s.atk + (crit ? 1 : 0);
        const hpLeft = target.hp - dmg;
        let monsters = s.floor.monsters.map((m) => (m.id === target.id ? { ...m, hp: hpLeft } : m));
        log.push(`你對${MONSTERS[target.kind].name}造成 ${dmg} 點傷害${crit ? '（暴擊！）' : ''}。`);
        if (hpLeft <= 0) {
          monsters = monsters.filter((m) => m.id !== target.id);
          log.push(DEATH_LINES[target.kind]);
          if (target.kind === 'R') monsters = monsters.map((m) => (m.kind === 'R' ? { ...m, hp: m.hp + 2 } : m));
          s = { ...s, kills: s.kills + 1 };
        }
        s = { ...s, floor: { ...s.floor, monsters } };
      } else if (isWall(s.floor, nx, ny)) {
        return result(state, [[{ kind: 'text', text: '前面是牆。這一步不算回合。' }, ...view(state)]]);
      } else {
        s = { ...s, px: nx, py: ny, floor: reveal(s.floor, nx, ny) };
        const item = s.floor.items.find((it) => it.x === nx && it.y === ny);
        if (item) {
          s = {
            ...s,
            coffee: s.coffee + (item.kind === 'coffee' ? 1 : 0),
            ducks: s.ducks + (item.kind === 'duck' ? 1 : 0),
            floor: { ...s.floor, items: s.floor.items.filter((it) => it !== item) },
          };
          log.push(item.kind === 'coffee' ? '你撿到一杯咖啡 ☕。' : '你撿到一隻小黃鴨 🦆。它看起來很懂。');
        }
        if (s.floor.exit[0] === nx && s.floor.exit[1] === ny) {
          const bossAlive = s.floor.monsters.some((m) => m.kind === 'D');
          if (s.floor.depth === MAX_DEPTH) {
            if (bossAlive) {
              log.push('死線惡魔還在，下不了班。');
            } else {
              s = { ...s, turns: s.turns + 1, status: 'won' };
              const profile = recordRun(ctx.profile, s);
              const won: RogueState = { ...s, rng: rng.state, prev: null };
              return result(
                won,
                [
                  [...log.map((t): Block => ({ kind: 'text', text: t })), { kind: 'text', tone: 'success', text: `✓ 你在第 ${s.turns} 回合準時下班了！` }],
                  endBlocks(s, profile),
                ],
                profile,
              );
            }
          } else {
            s = descend({ ...s, turns: s.turns + 1 }, log);
            const next: RogueState = { ...s, rng: rng.state, prev: snapshot };
            return result(next, [[...log.map((t): Block => ({ kind: 'text', text: t })), ...view(next)]]);
          }
        }
      }
    }

    s = { ...s, turns: s.turns + 1, floorTurns: s.floorTurns + 1 };
    s = monstersAct(s, rng, log);

    if (s.hp <= 0) {
      s = { ...s, status: 'dead' };
      const profile = recordRun(ctx.profile, s);
      const dead: RogueState = { ...s, rng: rng.state, prev: null };
      return result(
        dead,
        [
          [...log.map((t): Block => ({ kind: 'text', text: t })), { kind: 'text', tone: 'warn', text: `你在第 ${s.floor.depth} 層被${s.killedBy ? MONSTERS[s.killedBy].name : '不明 bug'}打倒了。` }, ...view(s)],
          endBlocks(s, profile),
        ],
        profile,
      );
    }

    const next: RogueState = { ...s, rng: rng.state, prev: snapshot };
    const blocks: Block[] = log.map((t) => ({ kind: 'text', text: t }));
    return result(next, [[...blocks, ...view(next)]]);
  },
};

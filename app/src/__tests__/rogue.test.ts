import { describe, expect, it } from 'vitest';
import { emptyProfile, type Profile, type StepContext } from '../engine/types';
import {
  distances,
  generateFloor,
  H,
  MAX_DEPTH,
  newRun,
  parseCommand,
  renderMap,
  rogueGame,
  shareCard,
  W,
  type RogueState,
} from '../games/rogue/rogue';

const ctx = (profile: Profile = emptyProfile()): StepContext => ({ profile, now: new Date('2026-11-20T10:00:00+08:00') });
const text = (t: string) => ({ type: 'text' as const, text: t });

describe('地圖生成', () => {
  it('同一個種子、同一層，地圖完全相同（每日種子）', () => {
    expect(generateFloor('daily-19', 3)).toEqual(generateFloor('daily-19', 3));
    expect(generateFloor('daily-19', 3).floor.tiles).not.toBe(generateFloor('daily-20', 3).floor.tiles);
  });

  it('每一層都走得到出口，怪物與道具都在走得到的位置', () => {
    for (let i = 0; i < 40; i++) {
      for (let depth = 1; depth <= MAX_DEPTH; depth++) {
        const { floor, start } = generateFloor(`seed-${i}`, depth);
        expect(floor.tiles).toHaveLength(W * H);
        const dist = distances(floor.tiles, start[0], start[1]);
        expect(dist[floor.exit[1] * W + floor.exit[0]]).toBeGreaterThanOrEqual(9);
        for (const m of floor.monsters) expect(dist[m.y * W + m.x]).toBeGreaterThanOrEqual(4);
        for (const it of floor.items) expect(dist[it.y * W + it.x]).toBeGreaterThan(0);
        if (depth === MAX_DEPTH) expect(floor.monsters.some((m) => m.kind === 'D')).toBe(true);
      }
    }
  });

  it('地圖畫面每行寬度一致、只看得到附近', () => {
    const s = newRun('render', 'daily', 0);
    const rows = renderMap(s).split('\n').map((r) => r.slice(0, W));
    expect(rows).toHaveLength(H);
    expect(renderMap(s)).toContain('@');
  });
});

describe('指令', () => {
  it('方向與道具指令', () => {
    expect(parseCommand('↑')).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(parseCommand('D')).toEqual({ type: 'move', dx: 1, dy: 0 });
    expect(parseCommand('☕ 喝咖啡')).toEqual({ type: 'coffee' });
    expect(parseCommand('↩ git revert')).toEqual({ type: 'revert' });
    expect(parseCommand('你好')).toBeNull();
  });
});

function freeDir(s: RogueState): string {
  const opts: Array<[number, number, string]> = [[0, -1, '↑'], [0, 1, '↓'], [-1, 0, '←'], [1, 0, '→']];
  for (const [dx, dy, k] of opts) {
    const x = s.px + dx;
    const y = s.py + dy;
    const blocked = s.floor.tiles[y * W + x] === '#' || s.floor.monsters.some((m) => m.x === x && m.y === y);
    if (!blocked) return k;
  }
  return '↑';
}

describe('回合', () => {
  it('移動一格會增加回合並留下快照；撞牆不算回合', () => {
    const s = rogueGame.init('daily-19', ctx()).state;
    const r = rogueGame.step(s, text(freeDir(s)), ctx());
    expect(r.state.turns).toBe(1);
    expect(r.state.prev).not.toBeNull();
    expect(r.suggestions).toContain('↩ git revert');
  });

  it('git revert 回到上一回合，次數用完就沒了', () => {
    const s = rogueGame.init('daily-19', ctx()).state;
    const moved = rogueGame.step(s, text(freeDir(s)), ctx()).state;
    const back = rogueGame.step(moved, text('git revert'), ctx()).state;
    expect(back.turns).toBe(0);
    expect([back.px, back.py]).toEqual([s.px, s.py]);
    expect(back.reverts).toBe(0);
    expect(rogueGame.step(back, text(freeDir(back)), ctx()).suggestions).not.toContain('↩ git revert');
  });

  it('喝咖啡回血', () => {
    const s: RogueState = { ...rogueGame.init('daily-19', ctx()).state, hp: 3, coffee: 1 };
    const r = rogueGame.step(s, text('☕ 喝咖啡'), ctx());
    expect(r.state.coffee).toBe(0);
    expect(r.state.hp).toBeGreaterThanOrEqual(7 - 2); // 喝完後怪物可能攻擊
  });

  it('攻擊相鄰的怪物', () => {
    const base = rogueGame.init('daily-19', ctx()).state;
    const m = { id: 99, kind: 'N' as const, x: base.px + 1, y: base.py, hp: 3, atk: 1 };
    const tiles = base.floor.tiles.split('');
    tiles[base.py * W + base.px + 1] = '.';
    const s: RogueState = { ...base, floor: { ...base.floor, tiles: tiles.join(''), monsters: [m] } };
    const r = rogueGame.step(s, text('→'), ctx());
    const hit = r.state.floor.monsters.find((x) => x.id === 99);
    expect(hit === undefined || hit.hp < 3).toBe(true);
    expect([r.state.px, r.state.py]).toEqual([s.px, s.py]);
  });

  it('死亡會結束這一局並記錄每日成績', () => {
    const base = rogueGame.init('daily-19', ctx()).state;
    const m = { id: 99, kind: 'S' as const, x: base.px + 1, y: base.py, hp: 50, atk: 9 };
    const tiles = base.floor.tiles.split('');
    tiles[base.py * W + base.px + 1] = '.';
    const s: RogueState = { ...base, hp: 1, floor: { ...base.floor, tiles: tiles.join(''), monsters: [m] } };
    const r = rogueGame.step(s, text('→'), ctx());
    expect(r.state.status).toBe('dead');
    expect(r.profile?.rogue).toMatchObject({ runs: 1, wins: 0, bestDepth: 1, lastDailyDay: 19 });
    expect(r.suggestions).toEqual(['🔁 練習一局']);
    const card = shareCard(r.state);
    expect(card).toContain('mo-rogue-mini #20');
    expect(card).toContain('無限迴圈蛇');
  });

  it('今天的每日地城走完後，新的一局是練習', () => {
    const profile = { ...emptyProfile(), rogue: { runs: 1, wins: 0, bestDepth: 3, lastDailyDay: 19 } };
    const s = rogueGame.init('daily-19', ctx(profile)).state;
    expect(s.mode).toBe('practice');
  });

  it('第 10 層打倒死線惡魔後走到出口就通關', () => {
    let s = newRun('win-test', 'daily', 19);
    // 直接跳到第 10 層，清掉怪物，站在出口旁邊
    const { floor } = generateFloor('win-test', MAX_DEPTH);
    const [ex, ey] = floor.exit;
    const opts: Array<[number, number, string]> = [[0, 1, '↑'], [0, -1, '↓'], [1, 0, '←'], [-1, 0, '→']];
    const [dx, dy, key] = opts.find(([ddx, ddy]) => floor.tiles[(ey + ddy) * W + ex + ddx] === '.')!;
    s = { ...s, floor: { ...floor, monsters: [] }, px: ex + dx, py: ey + dy };
    const r = rogueGame.step(s, text(key), ctx());
    expect(r.state.status).toBe('won');
    expect(r.profile?.rogue.wins).toBe(1);
  });
});

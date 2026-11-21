import { describe, expect, it } from 'vitest';
import { emptyProfile, type StepContext } from '../engine/types';
import { BOSS_MIN_LEVEL, CLASSES, ENEMIES, FLOORS, ITEMS, MAX_ENERGY, ROOMS, SHOP_ITEMS } from '../games/mud/data';
import { atkOf, defOf, expToNext, mudGame, newCharacter, parseCommand, refreshEnergy, type MudState } from '../games/mud/mud';

const NOW = new Date('2026-11-21T10:00:00+08:00');
const ctx = (now = NOW): StepContext => ({ profile: emptyProfile(), now });
const send = (s: MudState, text: string, now = NOW) => mudGame.step(s, { type: 'text', text }, ctx(now));

function hero(cls: 'engineer' | 'sales' | 'designer' = 'engineer', extra: Partial<MudState> = {}): MudState {
  const s = send(newCharacter('test', NOW), CLASSES[cls].name).state;
  return { ...s, ...extra };
}

describe('世界資料', () => {
  it('打獵房間的怪物都存在，商店商品都有價格', () => {
    for (const r of Object.values(ROOMS)) for (const e of r.enemies ?? []) expect(ENEMIES[e]).toBeDefined();
    for (const id of SHOP_ITEMS) expect(ITEMS[id].price).toBeGreaterThan(0);
    expect(Object.values(ENEMIES).filter((e) => e.boss)).toHaveLength(1);
  });

  it('電梯樓層指向存在的房間，鎖住的樓層有說明', () => {
    for (const f of FLOORS) expect(f.room ? ROOMS[f.room] : f.locked).toBeTruthy();
  });
});

describe('開場與建角', () => {
  it('一開始要選職業，選完回到大廳', () => {
    const start = mudGame.init('main', ctx());
    expect(start.state.phase).toBe('create');
    expect(start.suggestions).toEqual(['💻 工程師', '📞 業務', '🎨 設計師']);
    expect(mudGame.validate!('look', start.state)).not.toBeNull();
    const r = send(start.state, '📞 業務');
    expect(r.state.cls).toBe('sales');
    expect(r.state.hp).toBe(CLASSES.sales.hp);
    expect(r.state.room).toBe('lobby');
    expect(r.state.news[0].text).toContain('業務');
  });
});

describe('指令解析', () => {
  it('中文按鈕與英文 MUD 指令都可以', () => {
    const s = hero();
    expect(parseCommand('look', s)).toEqual({ type: 'look' });
    expect(parseCommand('stat', s)).toEqual({ type: 'status' });
    expect(parseCommand('go 3', s)).toEqual({ type: 'floor', index: 2 });
    expect(parseCommand('go b13', s)).toEqual({ type: 'floor', index: 6 });
    expect(parseCommand('⚔️ 巡邏', s)).toEqual({ type: 'patrol' });
    expect(parseCommand('隨便打打', s)).toBeNull();
  });

  it('電梯裡可以直接點樓層或打 3F', () => {
    const s = { ...hero(), room: 'elevator' as const };
    expect(parseCommand('5F 業務部', s)).toEqual({ type: 'floor', index: 3 });
    expect(parseCommand('3f', s)).toEqual({ type: 'floor', index: 2 });
  });
});

describe('移動與城鎮', () => {
  it('搭電梯換樓層；B13 鎖住', () => {
    let s = send(hero(), '🛗 搭電梯').state;
    expect(s.room).toBe('elevator');
    s = send(s, '3F 工程部').state;
    expect(s.room).toBe('eng');
    const locked = send({ ...s, room: 'elevator' }, 'B13 🔒');
    expect(locked.state.room).toBe('elevator');
    expect(JSON.stringify(locked.replies)).toContain('需要權限卡');
  });

  it('商店：錢夠才買得到，武器自動裝備', () => {
    let s = hero('engineer', { room: 'store', gold: 50 });
    s = send(s, '買 機械鍵盤（40）').state;
    expect(s.weapon).toBe('keyboard');
    expect(s.gold).toBe(10);
    expect(atkOf(s)).toBe(CLASSES.engineer.atk + 3);
    const poor = send(s, '買 雷射筆（120）');
    expect(poor.state.weapon).toBe('keyboard');
    expect(poor.state.gold).toBe(10);
  });

  it('只有在商店才能買東西、在大廳才能看公告欄', () => {
    const s = hero('engineer', { gold: 999 });
    expect(send({ ...s, room: 'eng' }, '買 珍奶').state.bag.boba ?? 0).toBe(0);
    expect(JSON.stringify(send({ ...s, room: 'eng' }, 'news').replies)).toContain('公告欄在 1F 大廳');
  });

  it('茶水間休息回滿血、扣 1 精力', () => {
    const s = hero('engineer', { room: 'pantry', hp: 3 });
    const r = send(s, '😴 休息（1 精力）').state;
    expect(r.hp).toBe(r.maxHp);
    expect(r.energy).toBe(MAX_ENERGY - 1);
  });

  it('NPC 對話會依序推進', () => {
    let s = hero('engineer', { room: 'lobby' });
    const first = JSON.stringify(send(s, '💬 跟保全大叔聊天').replies);
    s = send(s, '💬 跟保全大叔聊天').state;
    const second = JSON.stringify(send(s, '💬 跟保全大叔聊天').replies);
    expect(first).not.toBe(second);
  });
});

describe('精力', () => {
  it('巡邏扣精力，用完就不能巡邏', () => {
    const s = hero('engineer', { room: 'eng', energy: 0 });
    const r = send(s, '巡邏');
    expect(r.state.phase).toBe('explore');
    expect(JSON.stringify(r.replies)).toContain('精力用完了');
  });

  it('過了台灣午夜精力回滿', () => {
    const s = hero('engineer', { energy: 0 });
    const tomorrow = new Date('2026-11-22T00:05:00+08:00');
    expect(refreshEnergy(s, tomorrow).state.energy).toBe(MAX_ENERGY);
    expect(refreshEnergy(s, NOW).state.energy).toBe(0);
    expect(JSON.stringify(send(s, 'look', tomorrow).replies)).toContain('精力回滿');
  });
});

describe('戰鬥', () => {
  function inCombat(extra: Partial<MudState> = {}, cls: 'engineer' | 'sales' | 'designer' = 'engineer'): MudState {
    let s = hero(cls, { room: 'eng', ...extra });
    for (let i = 0; i < 50 && s.phase !== 'combat'; i++) s = send({ ...s, energy: MAX_ENERGY }, '巡邏').state;
    expect(s.phase).toBe('combat');
    return s;
  }

  it('巡邏會遇到這一層的怪物', () => {
    const s = inCombat();
    expect(ROOMS.eng.enemies).toContain(s.combat!.enemy);
    expect(s.energy).toBeLessThan(MAX_ENERGY);
  });

  it('攻擊造成傷害，打倒後拿到經驗與金錢並回到探索', () => {
    let s = inCombat({ baseAtk: 99 });
    const gold = s.gold;
    s = send(s, '⚔️ 攻擊').state;
    expect(s.phase).toBe('explore');
    expect(s.gold).toBeGreaterThan(gold);
    expect(s.news[0].text).toContain('打倒了');
  });

  it('技能有冷卻', () => {
    let s = inCombat({ maxHp: 999, hp: 999, baseDef: 99 });
    s = { ...s, combat: { ...s.combat!, hp: 999 } };
    s = send(s, '✨ Hotfix').state;
    expect(s.skillCd).toBeGreaterThan(0);
    const again = send(s, '✨ Hotfix');
    expect(JSON.stringify(again.replies)).toContain('冷卻');
  });

  it('業務的話術讓對手愣住', () => {
    let s = inCombat({ maxHp: 999, hp: 999 }, 'sales');
    s = { ...s, combat: { ...s.combat!, hp: 999 } };
    s = send(s, '✨ 話術').state;
    expect(s.combat!.stun).toBe(1);
    expect(s.combat!.talked).toBe(true);
  });

  it('戰敗會在茶水間醒來，損失金錢與精力', () => {
    let s = inCombat({ gold: 100 });
    s = { ...s, hp: 1, baseDef: 0, combat: { ...s.combat!, hp: 999, atk: 99 } };
    s = send(s, '⚔️ 攻擊').state;
    expect(s.phase).toBe('explore');
    expect(s.room).toBe('pantry');
    expect(s.gold).toBe(90);
    expect(s.hp).toBe(Math.ceil(s.maxHp / 2));
  });

  it('戰鬥中喝咖啡回血', () => {
    let s = inCombat({ hp: 5, baseDef: 99 });
    s = send(s, '☕ 喝美式咖啡（2）').state;
    expect(s.hp).toBeGreaterThan(5);
    expect(s.bag.coffee).toBe(1);
  });
});

describe('升級與 Boss', () => {
  it('經驗值夠就升級，可以連升', () => {
    let s = hero('engineer', { room: 'eng', exp: expToNext(1) + expToNext(2) - 1, baseAtk: 99 });
    for (let i = 0; i < 50 && s.phase !== 'combat'; i++) s = send({ ...s, energy: MAX_ENERGY }, '巡邏').state;
    s = send(s, '攻擊').state;
    expect(s.level).toBe(3);
    expect(s.maxHp).toBe(CLASSES.engineer.hp + 12);
  });

  it(`Lv${BOSS_MIN_LEVEL} 以下進不了大會議室`, () => {
    const r = send(hero('engineer', { room: 'meeting', level: BOSS_MIN_LEVEL - 1 }), '🚪 進入大會議室');
    expect(r.state.phase).toBe('explore');
    expect(JSON.stringify(r.replies)).toContain('與會資格');
  });

  it('週會每 3 回合延長並變強', () => {
    let s = send(hero('engineer', { room: 'meeting', level: BOSS_MIN_LEVEL, maxHp: 999, hp: 999, baseDef: 99 }), '🚪 進入大會議室').state;
    expect(s.combat!.enemy).toBe('weekly-meeting');
    s = { ...s, baseAtk: 0, weapon: null };
    for (let i = 0; i < 3; i++) s = send(s, '攻擊').state;
    expect(s.combat!.atk).toBe(ENEMIES['weekly-meeting'].atk + 1);
  });

  it('打倒週會取得權限卡碎片，第一章完成', () => {
    let s = send(hero('engineer', { room: 'meeting', level: BOSS_MIN_LEVEL }), '🚪 進入大會議室').state;
    s = { ...s, baseAtk: 999 };
    const r = send(s, '攻擊');
    expect(r.state.fragments).toBe(1);
    expect(r.state.flags.boss1).toBe(1);
    expect(JSON.stringify(r.replies)).toContain('第一章');
    expect(JSON.stringify(send({ ...r.state, room: 'meeting' }, '進入大會議室').replies)).toContain('提早結束');
  });

  it('防禦力包含防具', () => {
    expect(defOf(hero('engineer', { armor: 'headphones' }))).toBe(CLASSES.engineer.def + 4);
  });
});

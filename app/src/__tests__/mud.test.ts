import { describe, expect, it } from 'vitest';
import { emptyProfile, type StepContext } from '../engine/types';
import { BOSS_MIN_LEVEL, BOSSES, CLASSES, ENEMIES, FLOORS, ITEMS, KPI_QUEST_KILLS, MAX_ENERGY, PERKS, ROOMS, SHOP_ITEMS } from '../games/mud/data';
import {
  atkOf,
  defOf,
  energyMax,
  expToNext,
  isNight,
  mudGame,
  newCharacter,
  parseCommand,
  pendingPerkTier,
  refreshEnergy,
  shopItems,
  type MudState,
} from '../games/mud/mud';

const NOW = new Date('2026-11-21T10:00:00+08:00');
const ctx = (now = NOW): StepContext => ({ profile: emptyProfile(), now });
const send = (s: MudState, text: string, now = NOW) => mudGame.step(s, { type: 'text', text }, ctx(now));

function hero(cls: 'engineer' | 'sales' | 'designer' = 'engineer', extra: Partial<MudState> = {}): MudState {
  const s = send(newCharacter('test', NOW), CLASSES[cls].name).state;
  return { ...s, ...extra };
}

describe('世界資料', () => {
  it('打獵房間的怪物都存在，商店商品都有價格', () => {
    for (const r of Object.values(ROOMS)) {
      for (const e of r.enemies ?? []) expect(ENEMIES[e].night).toBeFalsy();
      for (const e of r.nightEnemies ?? []) expect(ENEMIES[e].night).toBe(true);
    }
    for (const id of SHOP_ITEMS) expect(ITEMS[id].price).toBeGreaterThan(0);
    expect(Object.values(ENEMIES).filter((e) => e.boss).map((e) => e.id).sort()).toEqual(BOSSES.map((b) => b.enemy).sort());
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
    expect(parseCommand('go b13', s)).toEqual({ type: 'floor', index: FLOORS.length - 1 });
    expect(parseCommand('go 10', s)).toEqual({ type: 'floor', index: FLOORS.findIndex((f) => f.room === 'legal') });
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

describe('第二章《加班》', () => {
  const ch2 = (extra: Partial<MudState> = {}) => hero('engineer', { flags: { boss1: 1, ch2intro: 1 }, fragments: 1, level: 5, ...extra });
  const DAY = new Date('2026-11-21T10:00:00+08:00');
  const NIGHT = new Date('2026-11-21T23:30:00+08:00');

  it('打倒第一章 Boss 前，8F 以上鎖住；之後開放', () => {
    const locked = send({ ...hero(), room: 'elevator' }, '8F 🔒');
    expect(locked.state.room).toBe('elevator');
    expect(locked.suggestions).toContain('8F 🔒');
    const open = send({ ...ch2(), room: 'elevator' }, '8F 行銷部');
    expect(open.state.room).toBe('mkt');
    expect(send({ ...ch2(), room: 'elevator' }, 'look').suggestions).toContain('12F 董事長室');
  });

  it('舊存檔打完第一章後第一次行動，會看到第二章開場', () => {
    const s = hero('engineer', { flags: { boss1: 1 } });
    const r = send(s, 'look');
    expect(JSON.stringify(r.replies)).toContain('第二章《加班》');
    expect(r.state.flags.ch2intro).toBe(1);
    expect(JSON.stringify(send(r.state, 'look').replies)).not.toContain('第二章《加班》');
  });

  it('夜間判斷以台灣時間 19:00~07:00 為準', () => {
    expect(isNight(DAY)).toBe(false);
    expect(isNight(NIGHT)).toBe(true);
    expect(isNight(new Date('2026-11-21T06:59:00+08:00'))).toBe(true);
    expect(isNight(new Date('2026-11-21T07:00:00+08:00'))).toBe(false);
  });

  it('夜間怪物只在晚上出現', () => {
    const nightOnly = new Set(Object.values(ROOMS).flatMap((r) => r.nightEnemies ?? []));
    const seen = (now: Date) => {
      const found = new Set<string>();
      let s = ch2({ room: 'it', energy: 999 });
      for (let i = 0; i < 200; i++) {
        const r = send({ ...s, energy: 999, phase: 'explore', combat: null }, '巡邏', now).state;
        if (r.combat) found.add(r.combat.enemy);
        s = r;
      }
      return found;
    };
    expect([...seen(DAY)].some((e) => nightOnly.has(e as never))).toBe(false);
    expect([...seen(NIGHT)].some((e) => nightOnly.has(e as never))).toBe(true);
  });

  it('商店的第二章商品要打完第一章才上架', () => {
    expect(shopItems(hero())).not.toContain('monitors');
    expect(shopItems(ch2())).toContain('monitors');
    const r = send(hero('engineer', { room: 'store', gold: 999 }), '買 雙螢幕（320）');
    expect(r.state.weapon).toBeNull();
    const ok = send(ch2({ room: 'store', gold: 999 }), '買 降噪 Pro 耳機（300）');
    expect(ok.state.armor).toBe('nc-pro');
  });

  describe('天賦', () => {
    it('Lv5 起每一階要選一個，選了才會往下一階', () => {
      const s = ch2({ level: 9 });
      expect(pendingPerkTier(s)).toBe(5);
      const first = send(s, '🌱 天賦：早鳥').state;
      expect(first.flags.perk5).toBe(2);
      expect(energyMax(first)).toBe(MAX_ENERGY + 5);
      expect(pendingPerkTier(first)).toBe(7);
      const wrongTier = send(first, '🌱 天賦：升遷之路').state;
      expect(wrongTier.flags.perk9).toBeUndefined();
    });

    it('抗壓 +15 HP、升遷之路 +4 攻擊', () => {
      let s = ch2({ level: 9, flags: { boss1: 1, ch2intro: 1, perk5: 1 } });
      const hp = s.maxHp;
      s = send(s, '🌱 天賦：抗壓').state;
      expect(s.maxHp).toBe(hp + 15);
      const atk = atkOf(s);
      s = send(s, '🌱 天賦：升遷之路').state;
      expect(atkOf(s)).toBe(atk + 4);
      expect(pendingPerkTier(s)).toBeNull();
    });

    it('咖啡因耐受讓回血道具效果 +50%', () => {
      const s = ch2({ hp: 1, maxHp: 999, bag: { coffee: 1 }, flags: { boss1: 1, ch2intro: 1, perk5: 1 } });
      expect(send(s, '☕ 喝美式咖啡（1）').state.hp).toBe(1 + Math.round(15 * 1.5));
    });

    it('每一階都有兩個選項', () => {
      for (const tier of [5, 7, 9]) expect(PERKS.filter((p) => p.tier === tier)).toHaveLength(2);
    });
  });

  describe('任務', () => {
    it('阿桂姨的保溫杯：接任務 → 9F 找到 → 回報拿便當', () => {
      let s = ch2({ room: 'pantry' });
      s = send(s, '💬 跟阿桂姨聊天').state;
      expect(s.flags.qThermos).toBe(1);
      s = { ...s, room: 'fin' };
      for (let i = 0; i < 100 && s.flags.qThermos === 1; i++) s = send({ ...s, energy: 99, phase: 'explore', combat: null }, '巡邏').state;
      expect(s.flags.qThermos).toBe(2);
      s = send({ ...s, room: 'pantry', phase: 'explore', combat: null }, '💬 跟阿桂姨聊天').state;
      expect(s.flags.qThermos).toBe(3);
      expect(s.bag.bento).toBe(2);
    });

    it('KPI-9000 的稽核：在 10F、11F 打倒 5 隻，回報拿防火牆', () => {
      let s = send(ch2({ room: 'it' }), '💬 跟 KPI-9000 說話').state;
      expect(s.flags.qKpi).toBe(1);
      let wins = 0;
      for (let i = 0; i < 200 && wins < KPI_QUEST_KILLS; i++) {
        s = send({ ...s, energy: 99, baseAtk: 999 }, s.phase === 'combat' ? '攻擊' : '巡邏').state;
        if (s.phase === 'explore' && (s.flags.kpiKills ?? 0) > wins) wins = s.flags.kpiKills!;
      }
      expect(s.flags.kpiKills).toBeGreaterThanOrEqual(KPI_QUEST_KILLS);
      s = send({ ...s, phase: 'explore', combat: null, armor: null }, '💬 跟 KPI-9000 說話').state;
      expect(s.flags.qKpi).toBe(2);
      expect(s.armor).toBe('firewall');
    });
  });

  describe('第二章 Boss：凌晨兩點的空降專案', () => {
    it('Lv9 以下進不去', () => {
      const r = send(ch2({ room: 'exec', level: 8 }), '🚪 敲董事長室的門');
      expect(r.state.phase).toBe('explore');
    });

    it('每 4 回合需求變更，血量過半暴怒', () => {
      let s = send(ch2({ room: 'exec', level: 9, maxHp: 9999, hp: 9999, baseDef: 999 }), '🚪 敲董事長室的門').state;
      expect(s.combat!.enemy).toBe('airdrop-project');
      s = { ...s, baseAtk: 0, weapon: null };
      for (let i = 0; i < 4; i++) s = send(s, '攻擊').state;
      expect(s.combat!.atk).toBe(ENEMIES['airdrop-project'].atk + 2);
      s = { ...s, combat: { ...s.combat!, hp: 100 } };
      s = send(s, '攻擊').state;
      expect(s.combat!.enraged).toBe(true);
    });

    it('打倒後取得第二片碎片，第二章完成', () => {
      let s = send(ch2({ room: 'exec', level: 9 }), '🚪 敲董事長室的門').state;
      s = { ...s, baseAtk: 9999 };
      const r = send(s, '攻擊');
      expect(r.state.fragments).toBe(2);
      expect(r.state.flags.boss2).toBe(1);
      expect(JSON.stringify(r.replies)).toContain('第二章《加班》完成');
    });
  });
});

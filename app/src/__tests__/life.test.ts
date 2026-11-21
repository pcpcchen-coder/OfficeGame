import { describe, expect, it } from 'vitest';
import { emptyProfile, type Profile, type StepContext } from '../engine/types';
import { ENDING_ORDER, ENDINGS, EVENTS, METER_ENDINGS, TRIGGERS, VETERAN_DAY } from '../games/life/events';
import { dayLabel, EFFECT_SCALE, lifeGame, meterEnding, newCareer, shareCard, type LifeState } from '../games/life/life';

const ctx = (profile: Profile = emptyProfile()): StepContext => ({ profile, now: new Date('2026-11-21T10:00:00+08:00') });
const text = (t: string) => ({ type: 'text' as const, text: t });
const eventById = (id: string) => EVENTS.find((e) => e.id === id)!;

/** 指定今天的事件 */
const withEvent = (s: LifeState, id: string): LifeState => ({ ...s, current: id });

describe('劇本資料', () => {
  it('事件 id 唯一、每則 3 個選項、選項文字不重複', () => {
    const ids = new Set<string>();
    for (const ev of EVENTS) {
      expect(ids.has(ev.id)).toBe(false);
      ids.add(ev.id);
      expect(ev.choices).toHaveLength(3);
      expect(new Set(ev.choices.map((c) => c.text)).size).toBe(3);
      for (const c of ev.choices) expect(c.result.length > 0 || c.gamble !== undefined).toBe(true);
    }
  });

  it('支線指向存在的 chainOnly 事件', () => {
    const targets = [
      ...EVENTS.flatMap((e) => e.choices.map((c) => c.schedule?.event).filter(Boolean)),
      ...TRIGGERS.map((t) => t.event),
    ] as string[];
    for (const t of targets) expect(eventById(t)?.chainOnly).toBe(true);
  });

  it('14 種結局都有辦法觸發', () => {
    const reachable = new Set<string>([
      ...Object.values(METER_ENDINGS).flatMap((x) => [x.low, x.high]),
      ...EVENTS.flatMap((e) => e.choices.map((c) => c.ending).filter(Boolean) as string[]),
      'veteran',
    ]);
    expect(ENDING_ORDER).toHaveLength(14);
    for (const id of ENDING_ORDER) {
      expect(reachable.has(id)).toBe(true);
      expect(ENDINGS[id].text.length).toBeGreaterThan(10);
    }
  });
});

describe('一天的流程', () => {
  it('新職涯：第 1 天、四個指標 50、有今天的事件', () => {
    const s = newCareer('t', 1);
    expect(s.day).toBe(1);
    expect(s.stats).toEqual({ p: 50, e: 50, s: 50, m: 50 });
    expect(eventById(s.current!)).toBeDefined();
  });

  it('選擇會套用放大後的數值並進到下一天', () => {
    const s = withEvent(newCareer('t', 1), 'boss-report');
    const r = lifeGame.step(s, text('「沒問題！」'), ctx());
    expect(r.state.day).toBe(2);
    expect(r.state.stats.p).toBe(50 + Math.round(10 * EFFECT_SCALE));
    expect(r.state.stats.e).toBe(50 - Math.round(18 * EFFECT_SCALE));
    expect(r.suggestions).toHaveLength(3);
  });

  it('可以用 1、2、3 選擇', () => {
    const s = withEvent(newCareer('t', 1), 'boss-report');
    const a = lifeGame.step(s, text('1'), ctx());
    const b = lifeGame.step(s, text('「沒問題！」'), ctx());
    expect(a.state.stats).toEqual(b.state.stats);
  });

  it('只接受建議回覆', () => {
    const s = withEvent(newCareer('t', 1), 'boss-report');
    expect(lifeGame.validate!('「沒問題！」', s)).toBeNull();
    expect(lifeGame.validate!('2', s)).toBeNull();
    expect(lifeGame.validate!('我要請假', s)).not.toBeNull();
  });

  it('週五會補精神，第 10 天發薪', () => {
    const s: LifeState = { ...withEvent(newCareer('t', 1), 'it-update'), day: 10 };
    const r = lifeGame.step(s, text('「好」'), ctx());
    expect(r.state.stats.e).toBe(56);
    expect(r.state.stats.m).toBe(55);
    expect(dayLabel(10)).toBe('第 2 週 · 週五（Day 10）');
  });
});

describe('結局', () => {
  it('指標歸零觸發結局並記錄收集', () => {
    const s: LifeState = { ...withEvent(newCareer('t', 1), 'boss-report'), stats: { p: 50, e: 5, s: 50, m: 50 } };
    const r = lifeGame.step(s, text('「沒問題！」'), ctx());
    expect(r.state.status).toBe('ended');
    expect(r.state.ending).toBe('burnout');
    expect(r.profile?.life).toMatchObject({ runs: 1, endings: ['burnout'] });
    expect(r.suggestions).toEqual(['📄 重新投履歷']);
    expect(shareCard(r.state, 1)).toContain('長假結局');
  });

  it('同一個結局不重複收集，重新投履歷會開新的一局', () => {
    const profile = { ...emptyProfile(), life: { runs: 1, bestDays: 3, endings: ['burnout'] } };
    const s: LifeState = { ...withEvent(newCareer('t', 2), 'boss-report'), stats: { p: 50, e: 5, s: 50, m: 50 } };
    const r = lifeGame.step(s, text('1'), ctx(profile));
    expect(r.profile?.life.endings).toEqual(['burnout']);
    const again = lifeGame.step(r.state, text('📄 重新投履歷'), ctx(r.profile));
    expect(again.state.status).toBe('playing');
    expect(again.state.day).toBe(1);
  });

  it('meterEnding 依指標判斷', () => {
    expect(meterEnding({ p: 0, e: 50, s: 50, m: 50 })).toBe('fired');
    expect(meterEnding({ p: 50, e: 50, s: 50, m: 100 })).toBe('fire');
    expect(meterEnding({ p: 50, e: 50, s: 50, m: 50 })).toBeNull();
  });

  it(`撐到第 ${VETERAN_DAY} 天是年資結局`, () => {
    const s: LifeState = { ...withEvent(newCareer('t', 1), 'it-update'), day: VETERAN_DAY };
    const r = lifeGame.step(s, text('「好」'), ctx());
    expect(r.state.ending).toBe('veteran');
  });
});

describe('支線', () => {
  it('答應 side project，4 天後會收到加入邀請，可以走向創業結局', () => {
    const start: LifeState = { ...withEvent(newCareer('t', 1), 'side-project'), day: 5 };
    const accepted = lifeGame.step(start, text('「有興趣！」'), ctx());
    expect(accepted.state.scheduled).toEqual([{ event: 'startup-offer', day: 9 }]);
    // 快轉到第 8 天結束，第 9 天的事件一定是加入邀請
    const r = lifeGame.step({ ...accepted.state, current: 'it-update', day: 8 }, text('「好」'), ctx());
    expect(r.state.current).toBe('startup-offer');
    expect(r.state.scheduled).toEqual([]);
    const end = lifeGame.step(r.state, text('「辭職加入！」'), ctx());
    expect(end.state.ending).toBe('startup');
  });

  it('請客 3 次會被推舉當福委會主委', () => {
    let s = newCareer('t', 1);
    for (const id of ['chicken', 'coffee-machine', 'chicken']) {
      s = { ...withEvent(s, id), stats: { p: 50, e: 50, s: 30, m: 80 } };
      const choice = eventById(id).choices.find((c) => c.count === 'treat')!;
      s = lifeGame.step(s, text(choice.text), ctx()).state;
    }
    expect(s.scheduled.some((x) => x.event === 'treat-king')).toBe(true);
  });

  it('股票加碼的結果由存檔裡的亂數決定（可重現）', () => {
    const s = withEvent(newCareer('gamble', 1), 'stocks');
    const a = lifeGame.step(s, text('加碼！'), ctx()).state.stats.m;
    const b = lifeGame.step(s, text('加碼！'), ctx()).state.stats.m;
    expect(a).toBe(b);
    expect(Math.abs(a - 50)).toBe(Math.round(18 * EFFECT_SCALE));
  });
});

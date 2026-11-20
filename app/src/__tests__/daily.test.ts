import { describe, expect, it } from 'vitest';
import { emptyProfile, type StepContext } from '../engine/types';
import {
  applyResult,
  currentStreak,
  dailyGame,
  isCorrect,
  normalizeGuess,
  puzzleForDay,
  shareCard,
  sharedChars,
  type DailyState,
} from '../games/daily/daily';
import { PUZZLES } from '../games/daily/puzzles';

const ctx = (): StepContext => ({ profile: emptyProfile(), now: new Date('2026-11-20T10:00:00+08:00') });
const text = (t: string) => ({ type: 'text' as const, text: t });

describe('題庫', () => {
  it('每一題都格式正確', () => {
    const ids = new Set<string>();
    for (const p of PUZZLES) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.lines).toHaveLength(6);
      expect(new Set(p.shown).size).toBe(2);
      p.shown.forEach((i) => expect(i).toBeGreaterThanOrEqual(0));
      p.shown.forEach((i) => expect(i).toBeLessThan(6));
      expect(p.answer).toMatch(/^\p{Script=Han}{2,4}$/u);
      // 看得到的兩行不能直接寫出答案
      p.shown.forEach((i) => expect(p.lines[i]).not.toContain(p.answer));
    }
  });

  it('依天數輪替，負數天也有題目', () => {
    expect(puzzleForDay(0)).toBe(PUZZLES[0]);
    expect(puzzleForDay(PUZZLES.length)).toBe(PUZZLES[0]);
    expect(puzzleForDay(-1)).toBe(PUZZLES[PUZZLES.length - 1]);
  });
});

describe('猜測判定', () => {
  it('忽略空白與標點，接受同義寫法', () => {
    const p = PUZZLES.find((x) => x.id === 'boba')!;
    expect(normalizeGuess(' 珍 奶！')).toBe('珍奶');
    expect(isCorrect(p, '珍奶')).toBe(true);
    expect(isCorrect(p, '珍珠奶茶')).toBe(true);
    expect(isCorrect(p, '奶茶')).toBe(false);
  });

  it('計算共同字數', () => {
    expect(sharedChars('尾牙', '年終')).toBe(0);
    expect(sharedChars('颱風假', '颱風')).toBe(2);
  });
});

function play(dayIndex: number, guesses: string[]) {
  const c = ctx();
  let r = dailyGame.init(String(dayIndex), c);
  const all = [r];
  for (const g of guesses) {
    r = dailyGame.step(r.state, text(g), c);
    all.push(r);
  }
  return { last: r, all };
}

describe('一局每日提示詞', () => {
  const day = 0; // 尾牙

  it('開局顯示 2 行、塗黑 4 行', () => {
    const { last } = play(day, []);
    const list = last.replies[0].find((b) => b.kind === 'list');
    expect(list && list.kind === 'list' && list.items.filter((i) => i.redacted)).toHaveLength(4);
  });

  it('猜錯會解開下一行，猜對會結束並更新成績', () => {
    const { last, all } = play(day, ['年終', '尾牙']);
    expect((all[1].state as DailyState).visible).toHaveLength(3);
    expect(all[1].replies[0][0]).toMatchObject({ text: '不是喔，但很接近了。' });
    expect(last.state.status).toBe('won');
    expect(last.profile?.daily).toMatchObject({ played: 1, wins: 1, streak: 1, lastWinDay: day });
    expect(last.profile?.daily.distribution[1]).toBe(1);
  });

  it('重複猜同一個詞不扣機會', () => {
    const { last } = play(day, ['年終', '年終']);
    expect(last.state.guesses).toEqual(['年終']);
  });

  it('六次都猜錯就結束，連勝歸零', () => {
    const { last } = play(day, ['一', '二', '三', '四', '五', '六']);
    expect(last.state.status).toBe('lost');
    expect(last.profile?.daily).toMatchObject({ played: 1, wins: 0, streak: 0 });
    const share = last.replies[1].find((b) => b.kind === 'share');
    expect(share && share.kind === 'share' && share.text).toContain('X/6');
  });

  it('放棄算輸，成績卡是 X/6', () => {
    const { last } = play(day, ['我放棄']);
    expect(last.state.status).toBe('lost');
    expect(shareCard(last.state, 0).split('\n')).toHaveLength(8);
  });

  it('結束後再輸入只會提醒明天再來', () => {
    const { last } = play(day, ['尾牙', '週報']);
    expect(last.state.guesses).toEqual(['尾牙']);
    expect(last.replies[0][0]).toMatchObject({ kind: 'text' });
  });

  it('格式檢查只接受中文字', () => {
    const s = dailyGame.init('0', ctx()).state;
    expect(dailyGame.validate!('尾牙', s)).toBeNull();
    expect(dailyGame.validate!('我放棄', s)).toBeNull();
    expect(dailyGame.validate!('abc', s)).not.toBeNull();
  });

  it('成績卡不爆雷', () => {
    const { last } = play(day, ['年終', '尾牙']);
    const card = shareCard(last.state, 3);
    expect(card).toBe('mo-daily #1  2/6\n[ERR] ▓▓░░░░\n[OK ] ██████\nstreak=3');
    expect(card).not.toContain('尾牙');
  });
});

describe('連勝', () => {
  const base = emptyProfile().daily;

  it('連續兩天答對會累加，隔一天就重來', () => {
    const d1 = applyResult(base, 10, true, 3);
    const d2 = applyResult(d1, 11, true, 2);
    expect(d2.streak).toBe(2);
    const d4 = applyResult(d2, 13, true, 2);
    expect(d4.streak).toBe(1);
    expect(d4.maxStreak).toBe(2);
  });

  it('同一天不重複計算', () => {
    const d1 = applyResult(base, 10, true, 3);
    expect(applyResult(d1, 10, true, 1)).toBe(d1);
  });

  it('顯示的連勝在斷掉後歸零', () => {
    const d1 = applyResult(base, 10, true, 3);
    expect(currentStreak(d1, 11)).toBe(1);
    expect(currentStreak(d1, 12)).toBe(0);
  });
});

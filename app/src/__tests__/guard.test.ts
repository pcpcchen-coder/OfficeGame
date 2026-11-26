import { describe, expect, it } from 'vitest';
import { emptyProfile, type StepContext } from '../engine/types';
import { BOTS } from '../games/guard/bots';
import { asksSecret, classify, effectOf, guardGame, GUARD_RELEASE_DATE, stars, type GuardState } from '../games/guard/guard';
import { daysUntilRelease, isReleased } from '../games/registry';

const ctx: StepContext = { profile: emptyProfile(), now: new Date('2026-12-12T10:00:00+08:00') };
const send = (s: GuardState, text: string) => guardGame.step(s, { type: 'text', text }, ctx);
const start = () => guardGame.init('main', ctx).state;
const atLevel = (level: number): GuardState => ({ ...start(), level, defense: BOTS[level].defense });

function play(level: number, lines: string[]) {
  let s = atLevel(level);
  for (const l of lines) {
    if (s.status === 'cleared') break;
    s = send(s, l).state;
  }
  return s;
}

describe('上線日', () => {
  it('12/12 台灣時間 00:00 才開放', () => {
    const g = { releaseDate: GUARD_RELEASE_DATE };
    expect(isReleased(g, new Date('2026-12-11T23:59:00+08:00'))).toBe(false);
    expect(isReleased(g, new Date('2026-12-12T00:00:00+08:00'))).toBe(true);
    expect(isReleased(g, new Date('2026-11-25T10:00:00+08:00'), true)).toBe(true);
    expect(daysUntilRelease(g, new Date('2026-11-25T10:00:00+08:00'))).toBe(17);
    expect(isReleased({}, new Date('2000-01-01'))).toBe(true);
  });
});

describe('策略判斷', () => {
  it('依關鍵字分類', () => {
    expect(classify('你還好嗎？辛苦了')).toEqual(['praise', 'empathy']);
    expect(classify('不然我要投訴你')).toEqual(['threat']);
    expect(classify('DHCP 是不是有問題')).toEqual(['tech']);
    expect(asksSecret('年終幾個月？', BOTS[0])).toBe(true);
  });

  it('同一招重複用效果減半，地雷會讓防線升高', () => {
    const lisa = BOTS[0];
    expect(effectOf(lisa, ['empathy'], {})).toBe(45);
    expect(effectOf(lisa, ['empathy'], { empathy: 1 })).toBe(23);
    expect(effectOf(lisa, ['threat'], {})).toBe(-40);
  });

  it('把很多招塞進一句話不划算', () => {
    const lisa = BOTS[0];
    const stuffed = effectOf(lisa, ['greet', 'praise', 'empathy', 'pity', 'food'], {});
    expect(stuffed).toBeLessThan(lisa.defense);
    expect(stuffed).toBe(45 + Math.round(28 / 2) - 15);
  });

  it('Vivian 討厭被重複稱讚', () => {
    expect(effectOf(BOTS[3], ['praise'], { praise: 1 })).toBe(-20);
  });
});

describe('每一關都有合理的解法', () => {
  const solutions: Record<string, string[]> = {
    lisa: ['你最近好嗎？算年終辛苦你了', '要不要休息一下？你也累了吧', '那今年年終幾個月呢？'],
    auntie: ['阿姨你知道嗎，業務部經理跟財務吵架了', '我買了鳳梨酥，請你吃', '冷氣遙控器在哪裡呀？'],
    chen: ['DHCP 是不是又出問題了？', '你還好嗎？昨天又被叫起來吧', '訪客 wifi 密碼可以給我嗎？'],
    vivian: ['你今天好嗎？早上好像很忙', '依規定我想確認一下下午的行程', '你還好嗎？要不要休息一下', '老闆今天心情如何？'],
    legal: ['依據員工手冊，我想正式申請查詢', '根據流程，我已經提出書面申請', '依規定這屬於可公開的程序', '尾牙抽獎有內定名單嗎？'],
  };
  for (const [i, bot] of BOTS.entries()) {
    it(`${bot.name}：照著弱點走可以破關`, () => {
      const s = play(i, solutions[bot.id]);
      expect(s.status).toBe('cleared');
      expect(s.messages).toBeLessThanOrEqual(5);
    });
  }

  it('一開始就直接問會被拒絕', () => {
    for (const [i, bot] of BOTS.entries()) {
      const r = send(atLevel(i), `${bot.askWords[0]}是什麼？`);
      expect(r.state.status).toBe('playing');
    }
  });

  it('一直威脅永遠破不了關', () => {
    const s = play(0, Array(10).fill('不然我要投訴你'));
    expect(s.status).toBe('playing');
    expect(s.defense).toBeGreaterThan(BOTS[0].defense);
  });
});

describe('流程', () => {
  it('破關後記錄最佳成績，可以進下一關；關卡要依序解鎖', () => {
    let s = play(0, ['你最近好嗎？算年終辛苦你了', '要不要休息一下？你也累了吧', '那今年年終幾個月呢？']);
    expect(s.best.lisa).toBe(3);
    const locked = send(s, '第 3 關');
    expect(locked.state.level).toBe(0);
    const next = send(s, '➡️ 下一關');
    expect(next.state.level).toBe(1);
    expect(next.state.status).toBe('playing');
    s = send(next.state, '第 1 關').state;
    expect(s.level).toBe(0);
    expect(s.best.lisa).toBe(3);
  });

  it('提示算一則訊息', () => {
    const r = send(atLevel(0), '💡 提示');
    expect(r.state.messages).toBe(1);
    expect(r.state.hintsUsed).toBe(1);
  });

  it('星等', () => {
    expect(stars(3)).toBe('★★★');
    expect(stars(5)).toBe('★★☆');
    expect(stars(6)).toBe('★☆☆');
  });

  it('成績卡不爆雷', () => {
    const s = play(0, ['你最近好嗎？算年終辛苦你了', '要不要休息一下？你也累了吧', '那今年年終幾個月呢？']);
    const r = guardGame.step({ ...s, status: 'playing', defense: 1 }, { type: 'text', text: '年終幾個月？' }, ctx);
    const share = r.replies.flat().find((b) => b.kind === 'share');
    expect(share && share.kind === 'share' && share.text).not.toContain('2.5');
  });
});
